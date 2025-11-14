import type { SchemaDefinition } from "mongoose";
import * as Mongoose from "mongoose";
import { ZodFirstPartyTypeKind, type z, type ZodArray, type ZodObject, type ZodRawShape } from "zod";

import type { SupportedType } from "./types";

/**
 * Represents a valid type for a Mongoose schema field definition. This is a recursive type that handles all possible
 * valid structures for a schema property, including nested objects and arrays.
 *
 * @internal
 */
type MongooseSchemaType =
	| Mongoose.Schema
	| MongooseSchemaType[]
	| typeof Boolean
	| typeof Date
	| typeof Number
	// This covers both a schema definition for a sub-document and the empty
	// object `{}` used for Mixed types.
	| typeof String
	// This covers an array of sub-documents or an array of primitives.
	// Mongoose expects an array with a single element defining the type.
	| { [key: string]: MongooseSchemaType }
	// This covers the object format for specifying a default value.
	| {
			default?: unknown;
			type: MongooseSchemaType;
	  };
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
 * @throws TypeError If the type is not supported.
 */
function convertField<T extends ZodRawShape>(type: string, zodField: T[Extract<keyof T, string>]): MongooseSchemaType {
	const unwrappedData = unwrapType(zodField);
	let coreType: MongooseSchemaType | undefined;
	switch (unwrappedData.definition._def.typeName) {
		case ZodFirstPartyTypeKind.ZodArray: {
			const arrayType = unwrappedData.definition as ZodArray<SupportedType>;
			const elementType = arrayType._def.type;
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
		case ZodFirstPartyTypeKind.ZodBoolean:
			coreType = Boolean;
			break;
		case ZodFirstPartyTypeKind.ZodDate:
			coreType = Date;
			break;
		case ZodFirstPartyTypeKind.ZodEnum: {
			const enumType = unwrappedData.definition as z.ZodEnum<[string, ...string[]]>;
			coreType = {
				enum: enumType.options,
				type: String,
			};
			break;
		}
		case ZodFirstPartyTypeKind.ZodNativeEnum: {
			const enumType = unwrappedData.definition as z.ZodNativeEnum<Record<string, unknown>>;
			coreType = {
				enum: Object.values(enumType.enum),
				type: String,
			};
			break;
		}
		case ZodFirstPartyTypeKind.ZodNumber:
			coreType = Number;
			break;
		case ZodFirstPartyTypeKind.ZodObject:
			break;
		case ZodFirstPartyTypeKind.ZodString:
			coreType = String;
			break;
		case ZodFirstPartyTypeKind.ZodUnion:
			coreType = {};
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

/**
 * Check if a Zod definition is an object
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an object
 */
function isZodObject(definition: SupportedType): definition is ZodObject<ZodRawShape> {
	return definition._def.typeName === ZodFirstPartyTypeKind.ZodObject;
}

/**
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(data: SupportedType): {
	defaultValue?: unknown;
	definition: SupportedType;
	nullable: boolean;
	optional: boolean;
} {
	let definition = data;
	let nullable = false;
	let optional = false;
	let defaultValue: unknown | undefined;
	while ("innerType" in definition._def) {
		if (definition._def.typeName === ZodFirstPartyTypeKind.ZodNullable) {
			nullable = true;
		}
		if (definition._def.typeName === ZodFirstPartyTypeKind.ZodOptional) {
			optional = true;
		}
		if ("defaultValue" in definition._def) {
			defaultValue = definition._def.defaultValue();
		}
		definition = definition._def.innerType;
	}
	return { defaultValue, definition, nullable, optional };
}
