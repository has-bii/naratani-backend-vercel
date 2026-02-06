# Order Delete Feature

## What's New

- **DELETE `//orders/:id`** - Delete PENDING or CANCELLED orders
- **GET `/orders/:id`** - Now includes `canDelete` boolean property

## Deletion Rules

| Condition | Requirement |
|-----------|-------------|
| Status | PENDING or CANCELLED |
| Sales | Can only delete own orders |
| Admin | Can delete any order |

## API Response

### GET `/orders/:id`

```json
{
  "error": null,
  "message": "ok",
  "data": {
    "id": "01H5X9Y",
    "status": "PENDING",
    "canDelete": true,
    ...
  }
}
```

### DELETE `/orders/:id`

**Success (200):**
```json
{
  "error": null,
  "message": "Pesanan berhasil dihapus",
  "data": null
}
```

**Errors:**
- `400` - Status not PENDING or CANCELLED
- `403` - Sales trying to delete another's order
- `404` - Order not found

## Stock Handling

| Status | Action |
|--------|--------|
| PENDING | Restores stock, releases reserved stock |
| CANCELLED | No stock change (already restored) |

## Breaking Changes

None.
