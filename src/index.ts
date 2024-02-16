import { ZodObject, ZodRawShape } from "zod";
import * as Mongoose from "mongoose";
import { SchemaDefinition } from "mongoose";
import { SupportedType } from "./types";

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
 * Check if a Zod definition is an object
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an object
 */
function isZodObject(definition: SupportedType): definition is ZodObject<ZodRawShape> {
    return definition._def.typeName === "ZodObject";
}

/**
 * Convert a Zod field to a Mongoose type
 *
 * @param type The key of the field
 * @param zodField The Zod field to convert
 * @returns The Mongoose type
 */
function convertField<T extends ZodRawShape>(type: string, zodField: T[Extract<keyof T, string>]) {
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
        case "ZodObject":
            break;
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
    if (isZodObject(unwrappedData.definition)) {
        coreType = createSchema(unwrappedData.definition);
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
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(data: SupportedType): { definition: SupportedType; optional: boolean; defaultValue?: unknown } {
    let definition = data;
    const optional = false;
    let defaultValue = undefined;
    while ("innerType" in definition._def) {
        if ("defaultValue" in definition._def) {
            defaultValue = definition._def.defaultValue();
        }
        definition = definition._def.innerType;
    }
    return { definition, optional, defaultValue };
}
