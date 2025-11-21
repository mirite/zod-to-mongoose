import type { ZodRawShape, ZodType } from "zod";
import { ZodArray, ZodDefault, ZodEnum, ZodNullable, ZodObject, ZodOptional } from "zod";

/**
 * Check if a Zod definition is an array
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an array
 */
export function isZodArray(definition: ZodType): definition is ZodArray<ZodType> {
	return definition instanceof ZodArray;
}

/**
 * Type guard for whether the definition is a default.
 *
 * @param definition The definition to check.
 * @returns True if the definition is a default.
 */
export function isZodDefault(definition: ZodType): definition is ZodDefault {
	return definition instanceof ZodDefault;
}
/**
 * Check if a Zod definition is an enum
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an enum
 */
export function isZodEnum(definition: ZodType): definition is ZodEnum {
	return definition instanceof ZodEnum;
}

/**
 * Type guard for whether the definition is nullable.
 *
 * @param definition The definition to check.
 * @returns True if the definition is nullable.
 */
export function isZodNullable(definition: ZodType): definition is ZodNullable {
	return definition instanceof ZodNullable;
}

/**
 * Check if a Zod definition is an object
 *
 * @param definition The Zod definition to check
 * @returns Whether the definition is an object
 */
export function isZodObject(definition: ZodType): definition is ZodObject<ZodRawShape> {
	return definition instanceof ZodObject;
}
/**
 * Type guard for whether the definition is optional.
 *
 * @param definition The definition to check.
 * @returns True if the definition is optional.
 */
export function isZodOptional(definition: ZodType): definition is ZodOptional {
	return definition instanceof ZodOptional;
}
