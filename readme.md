# Zod to Mongoose

This is a package for generating Mongoose schemas from Zod schemas. The goal is to improve type safety and reduce the amount of code that needs to be written when working with Mongoose.

## Installation

```bash
yarn add @mirite/zod-to-mongoose
```

## Usage

### Basic

Passing in a Zod schema will return a Mongoose schema.
```typescript
import { createSchema } from "@mirite/zod-to-mongoose";

const schema = createSchema(
    z.object({
        name: z.string().optional().default("Bob"),
        age: z.number().default(3).optional(),
        isHappy: z.boolean().optional(),
        birthday: z.date().default(new Date()),
    }),
);

const model = mongoose.model("modelName", schema);
const result = await model.create({
    isHappy: true,
    birthday: new Date("1980-01-01"),
});
````

### Advanced
If you pass a connection, the model will be created, registered with the connection, and returned for use.
```typescript
import { createSchema } from "@mirite/zod-to-mongoose";


const model = createSchema(
    z.object({
        name: z.string().optional().default("Bob"),
        age: z.number().default(3).optional(),
        isHappy: z.boolean().optional(),
        birthday: z.date().default(new Date()),
    }),
    "modelName", // The unique name to give the model
    connection, // Mongoose connection
);

const result = await model.create({
    isHappy: true,
    birthday: new Date("1980-01-01"),
});
```

### Caveats
Only a subset of Zod types are supported. The following types are supported:
- `z.string()`
- `z.number()`
- `z.boolean()`
- `z.date()`
- `z.object()` (Nested objects are supported)
- `z.union()` (Type safety is not guaranteed)

Additionally, no additional validation is performed on the Mongoose schema.
