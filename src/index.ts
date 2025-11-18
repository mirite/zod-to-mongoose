import type { Connection, Model, SchemaDefinition, SchemaDefinitionProperty } from "mongoose";
import { Schema, SchemaTypes } from "mongoose";
import type { z, ZodRawShape , ZodObject} from "zod";
import { ZodArray, ZodDefault, ZodEnum, ZodNullable, ZodOptional, ZodType } from "zod";

import { isZodArray, isZodDefault, isZodEnum, isZodNullable, isZodObject, isZodOptional } from "./typeGuards";

/**
 * Represents a valid type for a Mongoose schema field definition. This is a recursive type that handles all possible
 * valid structures for a schema property, including nested objects and arrays.
 *
 * @internal
 */
type MongooseSchemaType = SchemaDefinitionProperty;
export function createSchema<T extends ZodRawShape>(
	zodObject: ZodObject<T>,
	modelName: string,
	connection: Connection,
): { model: Model<z.infer<typeof zodObject>>; schema: Schema };
export function createSchema<T extends ZodRawShape>(zodObject: ZodObject<T>): Schema;
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
	connection?: Connection,
): Schema | { model: Model<z.infer<typeof zodObject>>; schema: Schema } {
	const convertedShape: Partial<SchemaDefinition> = {};
	for (const key in zodObject.shape) {
		const zodField = zodObject.shape[key];
		if (!(zodField instanceof ZodType)) {
			continue; // There's metadata in the shape that doesn't represent fields.
		}
		convertedShape[key] = convertField(key, zodField);
	}
	const schema = new Schema(convertedShape);
	if (!connection || !modelName) return schema;
	return { model: connection.model<z.infer<typeof zodObject>>(modelName, schema), schema };
}

/**
 * Convert a Zod field to a Mongoose type
 *
 * @param fieldName The key of the field
 * @param zodField The Zod field to convert
 * @returns The Mongoose type
 * @throws {TypeError} If the type is not supported.
 */
function convertField(fieldName: string, zodField: ZodType): MongooseSchemaType {
	const unwrappedData = unwrapType(zodField);
	let coreType: MongooseSchemaType | undefined;
	switch (unwrappedData.definition.type) {
		case "array": {
			if (!isZodArray(unwrappedData.definition))
				throw new TypeError(`Expected ${fieldName} to be of type ZodArray`);
			const elementType = unwrappedData.definition.element;
			if (isZodObject(elementType)) {
				const shape = elementType.shape;
				const convertedShape: { [key: string]: MongooseSchemaType } = {};
				for (const key in shape) {
					const nestedField = shape[key];
					if (!(nestedField instanceof ZodType)) {
						continue; // There's metadata in the shape that doesn't represent fields.
					}
					convertedShape[key] = convertField(key, nestedField);
				}
				coreType = [convertedShape];
			} else {
				coreType = [convertField(fieldName, elementType)];
			}
			break;
		}
		case "boolean":
			coreType = Boolean;
			break;
		case "date":
			coreType = Date;
			break;
		case "default":
			break;
		case "enum": {
			if (!isZodEnum(unwrappedData.definition))
				throw new TypeError(`Expected ${fieldName} to be of type ZodEnum`);
			const enumType = unwrappedData.definition;
			coreType = {
				enum: enumType.options,
				type: String,
			};
			break;
		}
		case "number":
			coreType = Number;
			break;
		case "object":
			break;
		case "string":
			coreType = String;
			break;
		case "union":
			coreType = SchemaTypes.Mixed;
			break;
		default:
			throw new TypeError(`Unsupported type: ${fieldName}`);
	}
	if (isZodObject(unwrappedData.definition)) {
		coreType = createSchema(unwrappedData.definition);
	}
	if (coreType === undefined) {
		throw new TypeError(`Could not determine Mongoose type for Zod type: ${fieldName}`);
	}

	const hasDefaultValue = unwrappedData.defaultValue !== undefined;

	if (unwrappedData.nullable && !hasDefaultValue) {
		return {
			default: null,
			type: coreType,
		};
	}

	if (hasDefaultValue) {
		return {
			default: unwrappedData.defaultValue,
			type: coreType,
		};
	}
	return coreType;
}

/**
 *
 */
function getValidEnumValues(obj: { [s: string]: unknown }): (number | string)[] {
	const validKeys = Object.keys(obj).filter((k) => typeof obj[k] === "number" || typeof obj[k] === "string");
	const filtered: { [s: string]: unknown } = {};
	for (const k of validKeys) {
		filtered[k] = obj[k];
	}

	return Object.values(filtered).filter((v) => typeof v === "string" || typeof v === "number");
}

/**
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(data: ZodType): {
	defaultValue?: unknown;
	definition: ZodType;
	nullable: boolean;
	optional: boolean;
} {
	let definition = data;
	let nullable = false;
	let optional = false;
	let defaultValue: unknown;
	while ("innerType" in definition.def && definition.def.innerType instanceof ZodType) {
		if (isZodNullable(definition)) {
			nullable = true;
		}
		if (isZodOptional(definition)) {
			optional = true;
		}
		if (isZodDefault(definition)) {
			defaultValue = definition.def.defaultValue;
		}
		definition = definition.def.innerType;
	}
	return { defaultValue, definition, nullable, optional };
}
