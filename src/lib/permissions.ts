import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

export const statement = {
  ...defaultStatements,
  product: ["create", "read", "update", "delete"] as const,
  category: ["create", "read", "update", "delete"] as const,
  shop: ["create", "read", "update", "delete"] as const,
} as const

export const ac = createAccessControl(statement)

export const admin = ac.newRole({
  ...adminAc.statements,
  product: ["create", "read", "update", "delete"],
  category: ["create", "read", "update", "delete"],
  shop: ["create", "read", "update", "delete"],
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
})
