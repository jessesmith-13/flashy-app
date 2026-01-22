type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined

type SnakeToCamel<S extends string> =
  S extends `${infer T}_${infer U}`
    ? `${T}${Capitalize<SnakeToCamel<U>>}`
    : S

type CamelToSnake<S extends string> =
  S extends `${infer T}${infer U}`
    ? U extends Uncapitalize<U>
      ? `${Lowercase<T>}${CamelToSnake<U>}`
      : `${Lowercase<T>}_${CamelToSnake<U>}`
    : S

type Camelized<T> =
  T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Camelized<U>[]
      : {
          [K in keyof T as SnakeToCamel<string & K>]: Camelized<T[K]>
        }

type Snakified<T> =
  T extends Primitive
    ? T
    : T extends Array<infer U>
      ? Snakified<U>[]
      : {
          [K in keyof T as CamelToSnake<string & K>]: Snakified<T[K]>
        }

export function toCamelCase<T>(obj: T): Camelized<T> {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as Camelized<T>
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase())
      result[camelKey] = toCamelCase(value)
    }

    return result as Camelized<T>
  }

  return obj as Camelized<T>
}

export function toSnakeCase<T>(obj: T): Snakified<T> {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase) as Snakified<T>
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()

      result[snakeKey] = toSnakeCase(value)
    }

    return result as Snakified<T>
  }

  return obj as Snakified<T>
}