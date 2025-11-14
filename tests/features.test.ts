import mongoose, { type SchemaDefinition } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createSchema } from "../src";

vi.mock("mongoose", () => {
	return {
		default: {
			connection: {
				model: vi.fn((_name, schema) => ({
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
			},
		},
		Schema: vi.fn((schemaDefinition) => ({
			obj: schemaDefinition, // Store the schema definition for access
		})),
	};
});

describe("Complex Schemas", () => {
	it("should handle the customPropertyMapping schema", () => {
		const CustomPropertyMappingSchema = z.object({
			sectionTitle: z.string().optional(),
			propertyKey: z.string(),
			displayTitle: z.string(),
			type: z.enum(["text", "enum-single", "enum-multi"]),
			enum_options: z.array(z.string()).optional(),
			useCase: z.enum(["edit", "readOnly"]),
			required: z.boolean().optional(),
		});

		const TestSchema = z.object({
			customPropertyMapping: z.array(CustomPropertyMappingSchema).optional(),
		});

		const { schema } = createSchema(TestSchema, "complex", mongoose.connection);
		expect(schema.obj.customPropertyMapping).toBeDefined();
		if (!schema.obj.customPropertyMapping) return;
		const customPropertyMapping = (schema.obj.customPropertyMapping as SchemaDefinition[])[0];
		expect(customPropertyMapping.type).toEqual({ type: String, enum: ["text", "enum-single", "enum-multi"] });
		expect(customPropertyMapping.useCase).toEqual({ type: String, enum: ["edit", "readOnly"] });
	});
});

describe("Nullable Schemas", () => {
	it("should handle nullable fields", () => {
		const NullableSchema = z.object({
			deletedAt: z.string().optional().nullable(),
		});

		const { schema } = createSchema(NullableSchema, "nullable", mongoose.connection);
		expect(schema.obj.deletedAt).toEqual({ type: String, default: null });
	});

	it("should handle nullable and optional fields", () => {
		const NullableSchema = z.object({
			deletedAt: z.string().nullable().optional(),
		});

		const { schema } = createSchema(NullableSchema, "nullable-optional", mongoose.connection);
		expect(schema.obj.deletedAt).toEqual({ type: String, default: null });
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

		const { schema } = createSchema(NativeEnumSchema, "native-enum", mongoose.connection);
		expect(schema.obj.useCase).toEqual({ type: String, enum: ["edit", "readOnly"] });
	});
});
