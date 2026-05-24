// Repo-local Figma Code Connect handoff for Travel Hunter DS v1.
// This file documents intended component mappings until official Code Connect tooling is added.

export const figmaFile = "https://www.figma.com/design/bvSkBGlFoFvgnlnVoWYfEk";

export const primitiveMappings = {
  Button: "frontend/src/components/ui.tsx#Button",
  LinkButton: "frontend/src/components/ui.tsx#LinkButton",
  TagBadge: "frontend/src/components/ui.tsx#Tag",
  Card: "frontend/src/components/ui.tsx#SurfaceCard",
  StatusPanel: "frontend/src/components/ui.tsx#StatusPanel",
  BottomTabItem: "frontend/src/components/AppLayout.tsx#BottomTabs",
} as const;

export const patternMappings = {
  BrandMark: "frontend/src/components/patterns.tsx#BrandMark",
  HomeRail: "frontend/src/components/patterns.tsx#HomeRail",
  ProfilePanel: "frontend/src/components/patterns.tsx#ProfilePanel",
  AuthForm: "frontend/src/components/patterns.tsx#AuthFormShell",
  ProfileSetupStep: "frontend/src/components/patterns.tsx#ProfileSetupStep",
} as const;
