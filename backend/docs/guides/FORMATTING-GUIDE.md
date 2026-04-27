# Formatting Guide - Control Your Code Formatting

## The Issue

You noticed that editing one line causes the whole file to reformat. This is because:

1. ✅ **Biome** auto-formats on save (from professional standards)
2. ✅ **Biome** auto-fixes on save (import organization, linting, etc.)
3. ✅ **Husky** auto-fixes on commit (via lint-staged)

**This is working as designed** for professional quality, but it can be disruptive during development.

---

## Solution: Choose Your Formatting Level

### Option 1: **Manual Formatting** (Recommended for Development) ✅ CURRENT

**VSCode Settings**:

```json
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "never"
  }
}
```

**When to format**:

- **Manually**: Press `Shift+Alt+F` (Windows/Linux) or `Cmd+Shift+P` → "Format Document" (Mac)
- **Before commit**: Husky will auto-fix everything
- **On demand**: `npm run format` or `npm run lint:fix`

**Pros**:

- ✅ No surprising reformats while typing
- ✅ You control when formatting happens
- ✅ Still get quality on commit (Husky)

**Cons**:

- ⚠️ Code might look messy during development
- ⚠️ Must remember to format before reviewing

---

### Option 2: **Format Only on Save** (Balanced)

**VSCode Settings**:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "never"
  }
}
```

**What happens**:

- ✅ Biome formats on save (indentation, spacing)
- ❌ Biome does NOT auto-fix linting issues (no import reorganization)
- ✅ Husky fixes everything on commit

**Pros**:

- ✅ Clean code automatically
- ✅ No import reorganization during development
- ✅ Full quality check on commit

**Cons**:

- ⚠️ Imports might be messy until commit

---

### Option 3: **Full Auto-Fix** (Default - Most Aggressive)

**VSCode Settings**:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit"
  }
}
```

**What happens**:

- ✅ Biome formats on save (indentation, spacing, etc.)
- ✅ Biome auto-fixes on save (import organization, linting issues, etc.)
- ✅ Maximum code quality

**Pros**:

- ✅ Always perfect code
- ✅ Enforces professional standards
- ✅ No manual work

**Cons**:

- ⚠️ **Reformats whole file on save** (what you're experiencing)
- ⚠️ Can be disruptive during development

---

## What's Currently Set

**I've changed it to Option 1** (Manual formatting) in `.vscode/settings.json`

Now:

- ❌ No auto-format on save
- ❌ No Biome auto-fix on save
- ✅ **Still enforced by Husky on commit!**

---

## How Husky Still Enforces Quality

Even with manual formatting, **Husky will auto-fix on commit**:

```bash
git commit -m "your message"

# Husky runs:
1. Biome check --write (fixes linting issues, imports, and code style)
2. Biome format --write (formats code)
3. Validates everything
4. Commits if all pass
```

**So you get**:

- ✅ Freedom during development
- ✅ Quality enforced on commit
- ✅ Best of both worlds

---

## Change Formatting Level Anytime

**To change**, edit `.vscode/settings.json`:

**For Option 2** (Format only):

```json
"editor.formatOnSave": true,
"editor.codeActionsOnSave": {
  "quickfix.biome": "never"
}
```

**For Option 3** (Full auto - default):

```json
"editor.formatOnSave": true,
"editor.codeActionsOnSave": {
  "quickfix.biome": "explicit"
}
```

---

## Manual Formatting Commands

When you want to format:

```bash
# Format all files
npm run format

# Format and fix all issues (lint + format)
npm run lint:fix

# Check what needs formatting
npm run format:check

# Check what needs fixing (linting only)
npm run lint
```

**Note**: All these commands now use Biome under the hood. The familiar npm script names remain the same for convenience.

---

## Git Will Still Enforce Quality

**On commit**, Husky runs lint-staged:

- ✅ Auto-fixes all issues
- ✅ Formats all staged files
- ✅ Blocks commit if errors remain

**On push**, Husky runs check:fast:

- ✅ Lints entire codebase
- ✅ Type-checks everything
- ✅ Blocks push if errors found

---

## Recommendation

**For Development**:

- Use **Option 1** (manual) - ✅ Already set!
- Format when you want: `Shift+Alt+F`
- Let Husky handle quality on commit

**For Team Settings** (later):

- Use **Option 2** (format only)
- Balances convenience and control

**For Strict Mode**:

- Use **Option 3** (full auto)
- Maximum quality, but disruptive

---

## Current Status

✅ **Changed to Option 1** (manual formatting)
✅ **Husky still enforces quality on commit**
✅ **You have control during development**

**Reload VSCode** for settings to take effect!

---

**Your code quality is still guaranteed by Husky - just not while you're typing!** ✅
