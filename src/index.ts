import * as Mongoose from "mongoose";
import type { SchemaDefinition } from "mongoose";
import type { z, ZodObject, ZodRawShape } from "zod";

import type { SupportedType } from "./types";

export function createSchema<T extends ZodRawShape>(
	zodObject: ZodObject<T>,
	modelName: string,
	connection: Mongoose.Connection,
): { schema: Mongoose.Schema; model: Mongoose.Model<z.infer<typeof zodObject>> };
export function createSchema<T extends ZodRawShape>(zodObject: ZodObject<T>): Mongoose.Schema;
/**
 * Create a Mongoose schema from a Zod shape
 *
 * @template T The Zod schema shape.
 * @param zodObject The Zod shape to create the schema from
 * @param modelName The unique name to assign to the model
 * @param connection The Mongoose connection to create the model from
 * @returns The Mongoose schema
 */
export function createSchema<T extends ZodRawShape>(
	zodObject: ZodObject<T>,
	modelName?: string,
	connection?: Mongoose.Connection,
): Mongoose.Schema | { schema: Mongoose.Schema; model: Mongoose.Model<z.infer<typeof zodObject>> } {
	const convertedShape: Partial<SchemaDefinition> = {};
	for (const key in zodObject.shape) {
		const zodField = zodObject.shape[key];
		convertedShape[key] = convertField(key, zodField);
	}
	const schema = new Mongoose.Schema(convertedShape);
	if (!connection || !modelName) return schema;
	return { schema, model: connection.model<z.infer<typeof zodObject>>(modelName, schema) };
}

/**
 * Check if a Zod definition is an object
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an object
 */
function isZodObject(definition: SupportedType): definition is ZodObject<ZodRawShape> {
	return definition.def.type === "object";
}

/**
 * Convert a Zod field to a Mongoose type
 *
 * @template T The Zod schema shape.
 * @param type The key of the field
 * @param zodField The Zod field to convert
 * @returns The Mongoose type
 * @throws TypeError If the type is not supported.
 */
function convertField<T extends ZodRawShape>(type: string, zodField: T[Extract<keyof T, string>]) {
	const unwrappedData = unwrapType(zodField);
	let coreType;
	switch (unwrappedData.definition.def.type) {
		case "string":
			coreType = String;
			break;
		case "number":
			coreType = Number;
			break;
		case "boolean":
			coreType = Boolean;
			break;
		case "date":
			coreType = Date;
			break;
		case "object":
			break;
		case "union":
			coreType = {};
			break;
		default:
			throw new TypeError(`Unsupported type: ${type}`);
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
	while ("innerType" in definition.def) {
		if ("defaultValue" in definition.def) {
			defaultValue = definition.def.defaultValue();
		}
		definition = definition.def.innerType;
	}
	return { definition, optional, defaultValue };
}
