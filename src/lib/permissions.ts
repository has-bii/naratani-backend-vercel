import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

export const statement = {
  ...defaultStatements,
  product: ["create", "read", "update", "delete"] as const,
  category: ["create", "read", "update", "delete"] as const,
  shop: ["create", "read", "update", "delete"] as const,
  order: ["create", "read", "update", "delete"] as const,
  supplier: ["create", "read", "update", "delete"] as const,
  dashboard: ["read", "revalidate"] as const,
  "sales-performance": ["read"] as const,
} as const

export const ac = createAccessControl(statement)

export const admin = ac.newRole({
  ...adminAc.statements,
  product: ["create", "read", "update", "delete"],
  category: ["create", "read", "update", "delete"],
  shop: ["create", "read", "update", "delete"],
  order: ["create", "read", "update", "delete"],
  supplier: ["create", "read", "update", "delete"],
  dashboard: ["read", "revalidate"],
  "sales-performance": ["read"],
})

export const user = ac.newRole({
  product: ["read"],
  category: ["read"],
  shop: ["read"],
})

export const sales = ac.newRole({
  product: ["read"],
  category: ["read"],
  shop: ["read"],
  order: ["create", "read"],
  "sales-performance": ["read"],
})
