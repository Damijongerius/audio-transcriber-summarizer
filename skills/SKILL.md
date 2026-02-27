---
name: Readable Code Conventions
description: Standards for maintaining a clean and readable codebase.
---

# Code Readability Conventions

To maintain a highly readable and maintainable codebase, we follow these core principles:

## 1. The 100-Line Rule
- **Standard**: Most files (components, hooks, utilities) should not exceed **100 lines**.
- **Exceptions**: Complex core logic or configuration files may exceed this slightly, but should still aim for maximum modularity.
- **Action**: If a file exceeds 100 lines, consider:
    - Splitting a component into smaller sub-components.
    - Extracting logic into custom hooks.
    - Moving utility functions to a separate `utils` or `lib` file.

## 2. Clean Folder Structure
- **Components**: Group related components in subdirectories within `src/components`.
- **Hooks**: Keep logic reusable and isolated in `src/hooks`.
- **Types**: Define shared types in `src/types`.
- **Features**: For larger applications, group by feature rather than just by type.

## 3. Clear Naming
- Use descriptive names for variables, functions, and components.
- Favor clarity over brevity.

## 4. Modern Aesthetics
- Ensure UI components follow the "Premium Design" philosophy: vibrant colors, smooth transitions, and consistent spacing.
