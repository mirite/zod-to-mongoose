import type { Connection, Schema, SchemaDefinition } from "mongoose";
import type { MockedObject } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createSchema } from "../src";

const connection: MockedObject<Connection> = vi.mockObject({
	model: vi.fn((_name: string, schema: Schema) => ({
		create: vi.fn((doc) => {
			const result = { _id: "123456789012345678901234", ...doc };
			// Apply default values from the schema
			for (const [key, value] of Object.entries(schema.obj)) {
				if (typeof value === "object" && value) {
					if ("default" in value && value.default !== undefined && result[key] === undefined) {
						result[key] = typeof value.default === "function" ? value.default() : value.default;
					}
				}
			}
			return Promise.resolve(result);
		}),
	})),
} as unknown as Connection);

describe("Complex Schemas", () => {
	it("should handle the customPropertyMapping schema", () => {
		const CustomPropertyMappingSchema = z.object({
			displayTitle: z.string(),
			enum_options: z.array(z.string()).optional(),
			propertyKey: z.string(),
			required: z.boolean().optional(),
			sectionTitle: z.string().optional(),
			type: z.enum(["text", "enum-single", "enum-multi"]),
			useCase: z.enum(["edit", "readOnly"]),
		});

		const TestSchema = z.object({
			customPropertyMapping: z.array(CustomPropertyMappingSchema).optional(),
		});

		const { schema } = createSchema(TestSchema, "complex", connection);
		expect(schema.obj.customPropertyMapping).toBeDefined();
		if (!schema.obj.customPropertyMapping) return;
		const customPropertyMapping = (schema.obj.customPropertyMapping as SchemaDefinition[])[0];
		expect(customPropertyMapping.type).toEqual({ enum: ["text", "enum-single", "enum-multi"], type: String });
		expect(customPropertyMapping.useCase).toEqual({ enum: ["edit", "readOnly"], type: String });
	});
});

describe("Nullable Schemas", () => {
	it("should handle nullable fields", () => {
		const NullableSchema = z.object({
			deletedAt: z.string().optional().nullable(),
		});

		const { schema } = createSchema(NullableSchema, "nullable", connection);
		expect(schema.obj.deletedAt).toEqual({ default: null, type: String });
	});

	it("should handle nullable and optional fields", () => {
		const NullableSchema = z.object({
			deletedAt: z.string().nullable().optional(),
		});

		const { schema } = createSchema(NullableSchema, "nullable-optional", connection);
		expect(schema.obj.deletedAt).toEqual({ default: null, type: String });
	});
});

describe("Native Enums", () => {
	it("should handle native enums", () => {
		enum UseCase {
			edit = "edit",
			readOnly = "readOnly",
		}
		const NativeEnumSchema = z.object({
			useCase: z.nativeEnum(UseCase),
		});

		const { schema } = createSchema(NativeEnumSchema, "native-enum", connection);
		expect(schema.obj.useCase).toEqual({ enum: ["edit", "readOnly"], type: String });
	});
});
