import { z, ZodObject, ZodRawShape } from "zod";
import * as Mongoose from "mongoose";
import { SchemaDefinition } from "mongoose";

export function createSchema<T extends ZodRawShape>(
    zodObject: ZodObject<T>,
    connection: Mongoose.Connection,
): { schema: Mongoose.Schema; model: Mongoose.Model<T> };
export function createSchema<T extends ZodRawShape>(zodObject: ZodObject<T>): Mongoose.Schema;
/**
 * Create a Mongoose schema from a Zod shape
 *
 * @param zodObject The Zod shape to create the schema from
 * @param connection The Mongoose connection to create the model from
 * @returns The Mongoose schema
 */
export function createSchema<T extends ZodRawShape>(
    zodObject: ZodObject<T>,
    connection?: Mongoose.Connection,
): Mongoose.Schema | { schema: Mongoose.Schema; model: Mongoose.Model<T> } {
    const convertedShape: Partial<SchemaDefinition> = {};
    for (const key in zodObject.shape) {
        const zodField = zodObject.shape[key];
        convertedShape[key] = convertField(key, zodField);
    }
    const schema = new Mongoose.Schema(convertedShape);
    if (!connection) return schema;
    return { schema, model: connection.model<T>("test", schema) };
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
    switch (zodField._def.typeName) {
        case "ZodString":
            return String;
        case "ZodNumber":
            return Number;
        case "ZodBoolean":
            return Boolean;
        case "ZodDate":
            return Date;
        default:
            throw new Error(`Unsupported type: ${type}`);
    }
}

/**
 * Check if a Zod field has a _def property
 *
 * @param zodField The Zod field to check
 * @returns Whether the Zod field has a _def property
 */
function hasDef<T>(zodField: T[Extract<keyof T, string>]): zodField is T[Extract<keyof T, string>] & { _def: object } {
    return zodField && typeof zodField === "object" && "_def" in zodField;
}

/**
 * Check if a Zod field has a typeName property
 *
 * @param zodField The Zod field to check
 * @returns Whether the Zod field has a typeName property
 */
function hasTypeName<T>(
    zodField: T[Extract<keyof T, string>],
): zodField is T[Extract<keyof T, string>] & { _def: { typeName: string } } {
    return hasDef(zodField) && "typeName" in zodField._def;
}
