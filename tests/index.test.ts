import mongoose, { Schema, SchemaDefinition } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createSchema } from "../src";

vi.mock("mongoose", () => {
	return {
		default: {
			connection: {
				model: vi.fn((_name, schema) => ({
					create: vi.fn(async (doc) => {
						const result = { _id: "123456789012345678901234", ...doc };
						// Apply default values from the schema
						for (const [key, value] of Object.entries(schema.obj)) {
							if (typeof value === "object" && value) {
								if ("default" in value && value.default !== undefined && result[key] === undefined) {
									result[key] = typeof value.default === "function" ? value.default() : value.default;
								}
							}
						}
						return result;
					}),
				})),
			},
		},
		Schema: vi.fn((schemaDefinition) => ({
			obj: schemaDefinition, // Store the schema definition for access
		})),
	};
});

describe("Creating schema", () => {
	it("should create a schema from a flat object with only primitives", async () => {
		const { model, schema } = createSchema(
			z.object({
				age: z.number(),
				birthday: z.date(),
				isHappy: z.boolean(),
				name: z.string(),
			}),
			"flat",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			age: 42,
			birthday: new Date("1980-01-01"),
			isHappy: true,
			name: "John Doe",
		});
		expect(String(result._id).length).toBe(24);
	});

	it("should create a schema from an object with default values", async () => {
		const { model, schema } = createSchema(
			z.object({
				age: z.number().default(3),
				birthday: z.date(),
				isHappy: z.boolean(),
				name: z.string().default("Bob"),
			}),
			"defaults",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			birthday: new Date("1980-01-01"),
			isHappy: true,
		});
		expect(result.age).toBe(3);
		expect(result.name).toBe("Bob");
	});

	it("should create a schema when values are optional", async () => {
		const { model, schema } = createSchema(
			z.object({
				age: z.number().default(3).optional(),
				birthday: z.date().default(new Date()),
				isHappy: z.boolean().optional(),
				name: z.string().optional().default("Bob"),
			}),
			"optional",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			birthday: new Date("1980-01-01"),
			isHappy: true,
		});
		expect(String(result._id).length).toBe(24);
		expect(result.name).toBe("Bob");
	});

	describe("Edge cases", () => {
		it("Should throw if an unsupported type is encountered", () => {
			expect(() =>
				createSchema(
					z.object({
						test: z.symbol(),
					}),
				),
			).toThrow(/Unsupported type/);
		});

		it("Shouldn't make a model if the name is missing", () => {
			const result = createSchema(z.object({}), "", mongoose.connection);
			expect(result.model).toBeFalsy();
		});
	});

	describe("Arrays", () => {
		it("should handle arrays of strings", () => {
			const obj = z.object({
				items: z.array(z.string()),
			});
			const { schema } = createSchema(obj, "array", mongoose.connection);
			expect(schema.obj.items).toEqual([String]);
		});

		it("should handle arrays of objects", () => {
			const obj = z.object({
				items: z.array(
					z.object({
						name: z.string(),
						value: z.number(),
					}),
				),
			});
			const { schema } = createSchema(obj, "array", mongoose.connection);
			expect(schema.obj.items).toBeInstanceOf(Array);
			expect(schema.obj.items).toBeDefined();
			if (!schema.obj.items) return;
			const subSchema = (schema.obj.items as SchemaDefinition[])[0];
			expect(subSchema.name).toBe(String);
			expect(subSchema.value).toBe(Number);
		});
	});

	describe("Objects", () => {
		it("Should be able to handle nested objects", async () => {
			const obj = z.object({
				address: z.object({
					city: z.string(),
					street: z.string(),
					zip: z.string(),
				}),
				name: z.string(),
			});
			const { model, schema } = createSchema(obj, "nested", mongoose.connection);
			expect(schema).toBeDefined();
			expect(model).toBeDefined();
			const result = await model.create({
				address: {
					city: "Anytown",
					street: "123 Main St",
					zip: "12345",
				},
				name: "John Doe",
			});
			expect(String(result._id).length).toBe(24);
			expect(result.address.street).toBe("123 Main St");
		});
	});

	describe("Unions", () => {
		const obj = z.object({
			salutation: z.union([z.string(), z.literal("Dr.")]),
		});
		const { model } = createSchema(obj, "union", mongoose.connection);
		it("Should be able to handle literals", async () => {
			const result = await model.create({
				salutation: "Dr.",
			});
			expect(String(result._id).length).toBe(24);
			expect(result.salutation).toBe("Dr.");
		});

		it("Should be able to handle customs", async () => {
			const result2 = await model.create({
				salutation: "Custom",
			});
			expect(String(result2._id).length).toBe(24);
			expect(result2.salutation).toBe("Custom");
		});
	});

	describe("Complex Schemas", () => {
		it("should handle the customPropertyMapping schema", () => {
			const CustomPropertyMappingSchema = z.object({
				sectionTitle: z.string().optional().describe(
					JSON.stringify({
						description: "The section title for grouping related properties in the UI",
					}),
				),
				propertyKey: z.string().describe(
					JSON.stringify({
						description: "The third party property key (can be nested using dot notation, e.g., 'properties.custom_field')",
					}),
				),
				displayTitle: z.string().describe(
					JSON.stringify({
						description: "The display title shown in the UI",
					}),
				),
				type: z.enum(['text', 'enum-single', 'enum-multi']).describe(
					JSON.stringify({
						description: "The field type: text (string input), enum-single (dropdown), enum-multi (multi-select)",
					}),
				),
				enum_options: z.array(z.string()).optional().describe(
					JSON.stringify({
						description: "Available options for enum-single and enum-multi types",
					}),
				),
				useCase: z.enum(['edit', 'readOnly']).describe(
					JSON.stringify({
						description: "Whether the field is editable or read-only in the UI",
					}),
				),
				required: z.boolean().optional().describe(
					JSON.stringify({
						description: "Whether the field is required",
					}),
				),
			});

			const TestSchema = z.object({
				customPropertyMapping: z.array(CustomPropertyMappingSchema).optional().describe(
					JSON.stringify({
						description: "Custom property mappings for advanced field configuration with sections and editable fields",
					}),
				),
			});

			const { schema } = createSchema(TestSchema, "complex", mongoose.connection);
			expect(schema.obj.customPropertyMapping).toBeDefined();
			if (!schema.obj.customPropertyMapping) return;
			const customPropertyMapping = (schema.obj.customPropertyMapping as SchemaDefinition[])[0];
			expect(customPropertyMapping.type).toEqual({ type: String, enum: ['text', 'enum-single', 'enum-multi'] });
			expect(customPropertyMapping.useCase).toEqual({ type: String, enum: ['edit', 'readOnly'] });
		});
	});
});
