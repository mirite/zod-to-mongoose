import {
    ZodBoolean,
    ZodDate,
    ZodDefault,
    ZodNumber,
    ZodObject,
    ZodRawShape,
    ZodString,
    ZodTypeAny,
    ZodUnion,
} from "zod";
import * as Mongoose from "mongoose";
import { SchemaDefinition } from "mongoose";

export function createSchema<T extends ZodRawShape>(
    zodObject: ZodObject<T>,
    modelName: string,
    connection: Mongoose.Connection,
): { schema: Mongoose.Schema; model: Mongoose.Model<T> };
export function createSchema<T extends ZodRawShape>(zodObject: ZodObject<T>): Mongoose.Schema;
/**
 * Create a Mongoose schema from a Zod shape
 *
 * @param zodObject The Zod shape to create the schema from
 * @param modelName The unique name to assign to the model
 * @param connection The Mongoose connection to create the model from
 * @returns The Mongoose schema
 */
export function createSchema<T extends ZodRawShape>(
    zodObject: ZodObject<T>,
    modelName?: string,
    connection?: Mongoose.Connection,
): Mongoose.Schema | { schema: Mongoose.Schema; model: Mongoose.Model<T> } {
    const convertedShape: Partial<SchemaDefinition> = {};
    for (const key in zodObject.shape) {
        const zodField = zodObject.shape[key];
        convertedShape[key] = convertField(key, zodField);
    }
    const schema = new Mongoose.Schema(convertedShape);
    if (!connection || !modelName) return schema;
    return { schema, model: connection.model<T>(modelName, schema) };
}

/**
 * Convert a Zod field to a Mongoose type
 *
 * @param type The key of the field
 * @param zodField The Zod field to convert
 * @returns The Mongoose type
 */
function convertField<T>(type: string, zodField: T[Extract<keyof T, string>]) {
    if (!hasTypeName(zodField)) throw new Error(`Unsupported type in field: ${type}`);
    const unwrappedData = unwrapType(zodField);
    let coreType;
    switch (unwrappedData.definition._def.typeName) {
        case "ZodString":
            coreType = String;
            break;
        case "ZodNumber":
            coreType = Number;
            break;
        case "ZodBoolean":
            coreType = Boolean;
            break;
        case "ZodDate":
            coreType = Date;
            break;
        default:
            throw new Error(`Unsupported type: ${type}`);
    }

    if (!unwrappedData.defaultValue) {
        return coreType;
    }
    return {
        type: coreType,
        default: unwrappedData.defaultValue,
    };
}

/**
 * Check if a Zod field has a _def property
 *
 * @param zodField The Zod field to check
 * @returns Whether the Zod field has a _def property
 */
function hasDef(zodField: unknown): zodField is { _def: object } {
    return !!(zodField && typeof zodField === "object" && "_def" in zodField);
}

/**
 * Check if a Zod field has a typeName property
 *
 * @param zodField The Zod field to check
 * @returns Whether the Zod field has a typeName property
 */
function hasTypeName(zodField: unknown): zodField is SupportedType {
    return hasDef(zodField) && "typeName" in zodField._def;
}

type SupportedPrimitive = ZodString | ZodNumber | ZodBoolean | ZodDate;
type SupportedType = SupportedPrimitive | ZodDefault<ZodTypeAny> | ZodObject<ZodRawShape> | ZodUnion<never>;

/**
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(data: SupportedType): { definition: SupportedType; defaultValue?: unknown } {
    if (!("innerType" in data._def)) {
        return { definition: data };
    }
    const subType = data._def.innerType;
    let defaultValue = undefined;
    if ("defaultValue" in data._def) {
        defaultValue = data._def.defaultValue();
    }
    return { definition: subType, defaultValue };
}
