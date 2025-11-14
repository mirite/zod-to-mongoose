import type { SchemaDefinition, SchemaTypeOptions } from "mongoose";
import { ZodNullable, ZodOptional } from "zod";
import type { z, ZodArray, ZodEnum, ZodNativeEnum, ZodObject, ZodRawShape, ZodTypeAny } from "zod";

import * as Mongoose from "mongoose";

import type { SupportedType } from "./types";

export function createSchema<T extends ZodRawShape>(
	zodObject: ZodObject<T>,
	modelName: string,
	connection: Mongoose.Connection,
): { model: Mongoose.Model<z.infer<typeof zodObject>>; schema: Mongoose.Schema; };
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
): Mongoose.Schema | { model: Mongoose.Model<z.infer<typeof zodObject>>; schema: Mongoose.Schema; } {
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
function convertField<T extends ZodRawShape>(
	type: string,
	zodField: T[Extract<keyof T, string>],
): SchemaTypeOptions<unknown> {
	const unwrappedData = unwrapType(zodField);
	let coreType;
	switch (unwrappedData.definition._def.typeName) {
		case "ZodArray": {
			const arrayType = unwrappedData.definition as ZodArray<SupportedType>;
			const elementType = arrayType._def.type;
			if (isZodObject(elementType)) {
				const shape = elementType.shape;
				const convertedShape: SchemaDefinition = {};
				for (const key in shape) {
					convertedShape[key] = convertField(key, shape[key]);
				}
				coreType = [convertedShape];
			} else {
				coreType = [convertField(type, elementType)];
			}
			break;
		}
		case "ZodBoolean":
			coreType = Boolean;
			break;
		case "ZodDate":
			coreType = Date;
			break;
		case "ZodEnum":
			coreType = {
				enum: (unwrappedData.definition as ZodEnum<[string, ...string[]]>)._def.values,
				type: String,
			};
			break;
		case "ZodNativeEnum":
			coreType = {
				enum: Object.values((unwrappedData.definition as ZodNativeEnum<any>)._def.values),
				type: String,
			};
			break;
		case "ZodNumber":
			coreType = Number;
			break;
		case "ZodObject":
			break;
		case "ZodString":
			coreType = String;
			break;
		case "ZodUnion": {
			const types = (unwrappedData.definition._def as any).options;
			const nullish = types.find((t: any) => t._def.typeName === "ZodNull");
			if (nullish) {
				const otherType = types.find((t: any) => t._def.typeName !== "ZodNull");
				const converted = convertField(type, otherType);
				(converted as any).default = null;
				coreType = converted;
				break;
			}
			coreType = {};
			break;
		}
		default:
			throw new TypeError(`Unsupported type: ${type}`);
	}
	if (isZodObject(unwrappedData.definition)) {
		coreType = createSchema(unwrappedData.definition);
	}

	if (unwrappedData.nullable) {
		return {
			default: null,
			type: coreType as SchemaTypeOptions<unknown>,
		};
	}

	if (!unwrappedData.defaultValue) {
		return coreType as SchemaTypeOptions<unknown>;
	}
	return {
		default: unwrappedData.defaultValue,
		type: coreType,
	};
}

/**
 * Check if a Zod definition is an object
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an object
 */
function isZodObject(definition: ZodTypeAny): definition is ZodObject<ZodRawShape> {
	return definition._def.typeName === "ZodObject";
}

/**
 * Takes a complex type and returns the inner type definition along with the default if present.
 *
 * @param data The type data to unwrap.
 * @returns The inner type data along with the default if present.
 */
function unwrapType(
	data: SupportedType,
): { defaultValue?: unknown; definition: SupportedType; nullable: boolean; optional: boolean; } {
	let definition: SupportedType = data;
	let optional = false;
	let nullable = false;
	let defaultValue = undefined;

	while (
		definition._def.typeName === "ZodOptional" ||
		definition._def.typeName === "ZodDefault" ||
		definition._def.typeName === "ZodNullable"
	) {
		if (definition._def.typeName === "ZodOptional") {
			optional = true;
			definition = (definition as ZodOptional<SupportedType>)._def.innerType as SupportedType;
		}
		if (definition._def.typeName === "ZodDefault") {
			defaultValue = definition._def.defaultValue();
			definition = definition._def.innerType as SupportedType;
		}
		if (definition._def.typeName === "ZodNullable") {
			nullable = true;
			definition = (definition as ZodNullable<SupportedType>)._def.innerType as SupportedType;
		}
	}

	return { defaultValue, definition, nullable, optional };
}
