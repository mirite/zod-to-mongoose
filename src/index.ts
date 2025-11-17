import type { SchemaDefinition } from "mongoose";
import * as Mongoose from "mongoose";
import type { z, ZodArray, ZodObject, ZodRawShape, ZodType } from "zod";

import type { SupportedType } from "./types";

/**
 * Represents a valid type for a Mongoose schema field definition. This is a recursive type that handles all possible
 * valid structures for a schema property, including nested objects and arrays.
 *
 * @internal
 */
type MongooseSchemaType = Mongoose.SchemaDefinitionProperty;
export function createSchema<T extends ZodRawShape>(
	zodObject: ZodObject<T>,
	modelName: string,
	connection: Mongoose.Connection,
): { model: Mongoose.Model<z.infer<typeof zodObject>>; schema: Mongoose.Schema };
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
): Mongoose.Schema | { model: Mongoose.Model<z.infer<typeof zodObject>>; schema: Mongoose.Schema } {
	const convertedShape: Partial<SchemaDefinition> = {};
	for (const key in zodObject.shape) {
		const zodField = zodObject.shape[key];
		convertedShape[key] = convertField(key, zodField);
	}
	const schema = new Mongoose.Schema(convertedShape);
	if (!connection || !modelName) return schema;
	return { model: connection.model<z.infer<typeof zodObject>>(modelName, schema), schema };
}

/**
 * Convert a Zod field to a Mongoose type
 *
 * @template T The Zod schema shape.
 * @param type The key of the field
 * @param zodField The Zod field to convert
 * @returns The Mongoose type
 * @throws {TypeError} If the type is not supported.
 */
function convertField<T extends ZodRawShape>(type: string, zodField: T[Extract<keyof T, string>]): MongooseSchemaType {
	const unwrappedData = unwrapType(zodField);
	let coreType: MongooseSchemaType | undefined;
	switch (unwrappedData.definition.type) {
		case "array": {
			const arrayType = unwrappedData.definition as ZodArray<SupportedType>;
			const elementType = arrayType.def;
			if (isZodObject(elementType)) {
				const shape = elementType.shape;
				const convertedShape: { [key: string]: MongooseSchemaType } = {};
				for (const key in shape) {
					convertedShape[key] = convertField(key, shape[key]);
				}
				coreType = [convertedShape];
			} else {
				coreType = [convertField(type, elementType)];
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
			coreType = Mongoose.SchemaTypes.Mixed;
			break;
		default:
			throw new TypeError(`Unsupported type: ${type}`);
	}
	if (isZodObject(unwrappedData.definition)) {
		coreType = createSchema(unwrappedData.definition);
	}
	if (coreType === undefined) {
		throw new TypeError(`Could not determine Mongoose type for Zod type: ${type}`);
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

function getValidEnumValues(obj: { [s: string]: unknown }): (number | string)[] {
	const validKeys = Object.keys(obj).filter((k) => typeof obj[k] === "number" || typeof obj[k] === "string");
	const filtered: { [s: string]: unknown } = {};
	for (const k of validKeys) {
		filtered[k] = obj[k];
	}

	return Object.values(filtered).filter((v) => typeof v === "string" || typeof v === "number");
}
/** @param definition */
function isZodDefault(definition: z.ZodType): definition is z.ZodDefault<SupportedType> {
	return definition.def.type === "default";
}

/** @param definition */
function isZodNullable(definition: z.ZodType): definition is z.ZodNullable<SupportedType> {
	return definition.def.type === "nullable";
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

/** @param definition */
function isZodOptional(definition: z.ZodType): definition is z.ZodOptional<SupportedType> {
	return definition.def.type === "optional";
}

/**
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(data: ZodType): {
	defaultValue?: unknown;
	definition: SupportedType;
	nullable: boolean;
	optional: boolean;
} {
	let definition = data;
	let nullable = false;
	let optional = false;
	let defaultValue: unknown;
	while ("innerType" in definition.def) {
		if (isZodNullable(definition)) {
			nullable = true;
		}
		if (isZodOptional(definition)) {
			optional = true;
		}
		if (isZodDefault(definition)) {
			defaultValue = definition._def.defaultValue();
		}
		definition = definition.def.type;
	}
	return { defaultValue, definition, nullable, optional };
}
