

## Plan: Add AI Support to Admin Dashboard

Add the "AI Support" menu item to the admin dashboard and render the `ChatSupport` component when selected, mirroring the user dashboard setup.

### Changes

**`src/pages/Index.tsx`**
1. Add `{ id: 'support', label: 'AI Support', icon: '🤖' }` to the `ADMIN_MENU` array
2. Add `'support': 'AI Support'` to the admin titles object
3. Add `{section === 'support' && <ChatSupport />}` in the admin dashboard render block
4. Hide the floating `ChatBubbleWidget` when admin is viewing the support section (same pattern as user dashboard)

Single file change, minimal scope.

