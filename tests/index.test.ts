import mongoose from "mongoose";
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
		const { schema, model } = createSchema(
			z.object({
				name: z.string(),
				age: z.number(),
				isHappy: z.boolean(),
				birthday: z.date(),
			}),
			"flat",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			name: "John Doe",
			age: 42,
			isHappy: true,
			birthday: new Date("1980-01-01"),
		});
		expect(String(result._id).length).toBe(24);
	});

	it("should create a schema from an object with default values", async () => {
		const { schema, model } = createSchema(
			z.object({
				name: z.string().default("Bob"),
				age: z.number().default(3),
				isHappy: z.boolean(),
				birthday: z.date(),
			}),
			"defaults",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			isHappy: true,
			birthday: new Date("1980-01-01"),
		});
		expect(result.age).toBe(3);
		expect(result.name).toBe("Bob");
	});

	it("should create a schema when values are optional", async () => {
		const { schema, model } = createSchema(
			z.object({
				name: z.string().optional().default("Bob"),
				age: z.number().default(3).optional(),
				isHappy: z.boolean().optional(),
				birthday: z.date().default(new Date()),
			}),
			"optional",
			mongoose.connection,
		);
		expect(schema).toBeDefined();
		expect(model).toBeDefined();
		const result = await model.create({
			isHappy: true,
			birthday: new Date("1980-01-01"),
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

	describe("Objects", () => {
		it("Should be able to handle nested objects", async () => {
			const obj = z.object({
				name: z.string(),
				address: z.object({
					street: z.string(),
					city: z.string(),
					zip: z.string(),
				}),
			});
			const { schema, model } = createSchema(obj, "nested", mongoose.connection);
			expect(schema).toBeDefined();
			expect(model).toBeDefined();
			const result = await model.create({
				name: "John Doe",
				address: {
					street: "123 Main St",
					city: "Anytown",
					zip: "12345",
				},
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
});
