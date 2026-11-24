import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { createSchema } from "../src/index.js";

describe("Creating schema", () => {
	let mongoServer: MongoMemoryServer;
	let connection: mongoose.Connection;

	beforeEach(async () => {
		mongoServer = await MongoMemoryServer.create();
		const uri = mongoServer.getUri();
		connection = await mongoose.createConnection(uri).asPromise();
	});

	afterEach(async () => {
		await connection.close();
		await mongoServer.stop();
	});

	it("should create a schema from a flat object with only primitives", async () => {
		const { model, schema } = createSchema(
			z.object({
				age: z.number(),
				birthday: z.date(),
				isHappy: z.boolean(),
				name: z.string(),
			}),
			"flat",
			connection,
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
			connection,
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
			connection,
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
			const result = createSchema(z.object({}), "", connection);
			expect(result.model).toBeFalsy();
		});
	});

	describe("Arrays", () => {
		it("should handle arrays of strings", () => {
			const obj = z.object({
				items: z.array(z.string()),
			});
			const { schema } = createSchema(obj, "array", connection);
			expect(schema.obj.items).toEqual([{ type: String }]);
		});

		it("should handle arrays of objects", async () => {
			const obj = z.object({
				items: z.array(
					z.object({
						name: z.string(),
						value: z.number(),
					}),
				),
			});
			const { model, schema } = createSchema(obj, "array", connection);
			if (!Array.isArray(schema.obj.items)) {
				throw new Error("Expected items to be an array");
			}

			const subSchema = schema.obj.items[0];
			if (typeof subSchema !== "object" || subSchema === null) {
				throw new Error("Expected subschema to be an object");
			}
			if (!("name" in subSchema)) throw new Error("Expected name to be in subschema");
			expect(subSchema.name).toEqual({ type: String });
			if (!("value" in subSchema)) throw new Error("Expected name to be in subschema");
			expect(subSchema.value).toEqual({ type: Number });
			const result = await model.create({ items: [{ name: "a", value: 0 }] });
			expect(result.items).containSubset([{ name: "a", value: 0 }]);
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
			const { model, schema } = createSchema(obj, "nested", connection);
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
		it("Should evaluate schema at document creation", async () => {
			const { model } = createSchema(
				z.object({
					createdAt: z.date().default(() => new Date()),
					items: z.array(z.object({ qty: z.number(), type: z.string() })),
				}),
				"createdAtTest",
				connection,
			);
			const a = await model.create({ items: [{ qty: 2, type: "book" }] });

			await new Promise((r) => setTimeout(r, 30));
			const b = await model.create({ items: [] });
			expect(a.createdAt.getTime()).not.toBeCloseTo(b.createdAt.getTime());
		});
	});

	describe("Unions", () => {
		const obj = z.object({
			salutation: z.union([z.string(), z.literal("Dr.")]),
		});
		it("Should be able to handle literals", async () => {
			const { model } = createSchema(obj, "union", connection);
			const result = await model.create({
				salutation: "Dr.",
			});
			expect(String(result._id).length).toBe(24);
			expect(result.salutation).toBe("Dr.");
		});

		it("Should be able to handle customs", async () => {
			const { model } = createSchema(obj, "union", connection);
			const result2 = await model.create({
				salutation: "Custom",
			});
			expect(String(result2._id).length).toBe(24);
			expect(result2.salutation).toBe("Custom");
		});
	});
});
