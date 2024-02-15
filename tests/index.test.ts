import { z } from "zod";
import { createSchema } from "../src";
import { connect, connection, disconnect } from "mongoose";
beforeAll(async () => {
    const connectionStr = "mongodb://localhost:27017";
    const dbName = "test";
    await connect(`${connectionStr}/${dbName}`);
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
            connection,
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
            connection,
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
            connection,
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

    afterAll(() => {
        disconnect();
    });
});
