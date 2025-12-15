---
id: adr-4-diataxis-framework-integration
title: "ADR-004: Diataxis Framework Integration"
sidebar_label: "ADR-004: Diataxis Framework Integration"
sidebar_position: 4
documcp:
  last_updated: "2025-01-14T00:00:00.000Z"
  last_validated: "2025-01-14T00:00:00.000Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 9bbac23
---

# ADR-004: Diataxis Framework Integration for Documentation Structure

## Status

Accepted

## Context

DocuMCP aims to improve the quality and effectiveness of technical documentation by implementing proven information architecture principles. The Diataxis framework provides a systematic approach to organizing technical documentation into four distinct categories that serve different user needs and learning contexts.

Diataxis Framework Components:

- **Tutorials**: Learning-oriented content for skill acquisition (study context)
- **How-to Guides**: Problem-solving oriented content for specific tasks (work context)
- **Reference**: Information-oriented content for lookup and verification (information context)
- **Explanation**: Understanding-oriented content for context and background (understanding context)

Current documentation challenges:

- Most projects mix different content types without clear organization
- Users struggle to find appropriate content for their current needs
- Documentation often fails to serve different user contexts effectively
- Information architecture is typically ad-hoc and inconsistent

The framework addresses fundamental differences in user intent:

- **Study vs. Work**: Different contexts require different content approaches
- **Acquisition vs. Application**: Learning new skills vs. applying existing knowledge
- **Practical vs. Theoretical**: Task completion vs. understanding concepts

## Decision

We will integrate the Diataxis framework as the foundational information architecture for all DocuMCP-generated documentation structures, with intelligent content planning and navigation generation adapted to each static site generator's capabilities.

### Integration Approach:

#### 1. Automated Structure Generation

- **Directory organization** that clearly separates Diataxis content types
- **Navigation systems** that help users understand content categorization
- **Template generation** for each content type with appropriate guidance
- **Cross-reference systems** that maintain logical relationships between content types

#### 2. Content Type Templates

- **Tutorial templates** with learning objectives, prerequisites, step-by-step instructions
- **How-to guide templates** focused on problem-solution patterns
- **Reference templates** for systematic information organization
- **Explanation templates** for conceptual and architectural content

#### 3. Content Planning Intelligence

- **Automated content suggestions** based on project analysis
- **Gap identification** for missing content types
- **User journey mapping** to appropriate content categories
- **Content relationship mapping** to ensure comprehensive coverage

#### 4. SSG-Specific Implementation

- **Adaptation to SSG capabilities** while maintaining Diataxis principles
- **Theme and plugin recommendations** that support Diataxis organization
- **Navigation configuration** optimized for each SSG's features

## Alternatives Considered

### Generic Documentation Templates

- **Pros**: Simpler implementation, fewer constraints on content organization
- **Cons**: Perpetuates existing documentation quality problems, no systematic improvement
- **Decision**: Rejected due to missed opportunity for significant quality improvement

### Custom Documentation Framework

- **Pros**: Full control over documentation approach and features
- **Cons**: Reinventing proven methodology, reduced credibility, maintenance burden
- **Decision**: Rejected in favor of proven, established framework

### Multiple Framework Options

- **Pros**: Could accommodate different project preferences and approaches
- **Cons**: Choice paralysis, inconsistent quality, complex implementation
- **Decision**: Rejected to maintain focus and ensure consistent quality outcomes

### Optional Diataxis Integration

- **Pros**: Gives users choice, accommodates existing documentation structures
- **Cons**: Reduces value proposition, complicates implementation, inconsistent results
- **Decision**: Rejected to ensure consistent quality and educational value

## Consequences

### Positive

- **Improved Documentation Quality**: Systematic application of proven principles
- **Better User Experience**: Users can find appropriate content for their context
- **Educational Value**: Projects learn proper documentation organization
- **Consistency**: All DocuMCP projects benefit from same high-quality structure
- **Maintenance Benefits**: Clear content types simplify ongoing documentation work

### Negative

- **Learning Curve**: Teams need to understand Diataxis principles for optimal results
- **Initial Overhead**: More structure requires more initial planning and content creation
- **Rigidity**: Some projects might prefer different organizational approaches

### Risks and Mitigations

- **User Resistance**: Provide clear education about benefits and implementation guidance
- **Implementation Complexity**: Start with basic structure, enhance over time
- **Content Quality**: Provide high-quality templates and examples

## Implementation Details

### Diataxis Type Tracking in Code Examples (Phase 3 Enhancement)

Code examples in documentation are now tracked with Diataxis type information to enable context-aware validation and better content organization:

```typescript
interface CodeExample {
  language: string;
  code: string;
  description: string;
  referencedSymbols: string[];
  diataxisType?: "tutorial" | "how-to" | "reference" | "explanation";
  validationHints?: {
    expectedBehavior?: string;
    dependencies?: string[];
    contextRequired?: boolean;
  };
}
```

**Benefits**:

- Context-aware validation based on Diataxis category
- Improved code example organization and discovery
- Better drift detection for category-specific examples
- Enhanced content accuracy validation

**Implementation**: The drift detection system (ADR-009) uses Diataxis type information to provide category-specific validation rules and priority scoring.

### Directory Structure Generation

```typescript
interface DiataxisStructure {
  tutorials: DirectoryConfig;
  howToGuides: DirectoryConfig;
  reference: DirectoryConfig;
  explanation: DirectoryConfig;
  navigation: NavigationConfig;
}

const DIATAXIS_TEMPLATES: Record<SSGType, DiataxisStructure> = {
  hugo: {
    tutorials: { path: "content/tutorials", layout: "tutorial" },
    howToGuides: { path: "content/how-to", layout: "guide" },
    reference: { path: "content/reference", layout: "reference" },
    explanation: { path: "content/explanation", layout: "explanation" },
    navigation: { menu: "diataxis", weight: "category-based" },
  },
  // ... other SSG configurations
};
```

### Content Template System

```typescript
interface ContentTemplate {
  frontmatter: Record<string, any>;
  structure: ContentSection[];
  guidance: string[];
  examples: string[];
}

const TUTORIAL_TEMPLATE: ContentTemplate = {
  frontmatter: {
    title: "{{ tutorial_title }}",
    description: "{{ tutorial_description }}",
    difficulty: "{{ difficulty_level }}",
    prerequisites: "{{ prerequisites }}",
    estimated_time: "{{ time_estimate }}",
  },
  structure: [
    { section: "learning_objectives", required: true },
    { section: "prerequisites", required: true },
    { section: "step_by_step_instructions", required: true },
    { section: "verification", required: true },
    { section: "next_steps", required: false },
  ],
  guidance: [
    "Focus on learning and skill acquisition",
    "Provide complete, working examples",
    "Include verification steps for each major milestone",
    "Assume minimal prior knowledge",
  ],
};
```

### Content Planning Algorithm

```typescript
interface ContentPlan {
  tutorials: TutorialSuggestion[];
  howToGuides: HowToSuggestion[];
  reference: ReferenceSuggestion[];
  explanation: ExplanationSuggestion[];
}

function generateContentPlan(projectAnalysis: ProjectAnalysis): ContentPlan {
  return {
    tutorials: suggestTutorials(projectAnalysis),
    howToGuides: suggestHowToGuides(projectAnalysis),
    reference: suggestReference(projectAnalysis),
    explanation: suggestExplanation(projectAnalysis),
  };
}

function suggestTutorials(analysis: ProjectAnalysis): TutorialSuggestion[] {
  const suggestions: TutorialSuggestion[] = [];

  // Getting started tutorial (always recommended)
  suggestions.push({
    title: "Getting Started",
    description: "First steps with {{ project_name }}",
    priority: "high",
    estimated_effort: "medium",
  });

  // Feature-specific tutorials based on project complexity
  if (analysis.complexity.apiSurface > 5) {
    suggestions.push({
      title: "API Integration Tutorial",
      description: "Complete guide to integrating with the API",
      priority: "high",
      estimated_effort: "large",
    });
  }

  return suggestions;
}
```

### Navigation Generation

```typescript
interface DiataxisNavigation {
  structure: NavigationItem[];
  labels: NavigationLabels;
  descriptions: CategoryDescriptions;
}

const NAVIGATION_STRUCTURE: DiataxisNavigation = {
  structure: [
    {
      category: "tutorials",
      label: "Tutorials",
      description: "Learning-oriented guides",
      icon: "graduation-cap",
      order: 1,
    },
    {
      category: "how-to",
      label: "How-to Guides",
      description: "Problem-solving recipes",
      icon: "tools",
      order: 2,
    },
    {
      category: "reference",
      label: "Reference",
      description: "Technical information",
      icon: "book",
      order: 3,
    },
    {
      category: "explanation",
      label: "Explanation",
      description: "Understanding and context",
      icon: "lightbulb",
      order: 4,
    },
  ],
  labels: {
    tutorials: "Learn",
    howToGuides: "Solve",
    reference: "Lookup",
    explanation: "Understand",
  },
  descriptions: {
    tutorials: "Step-by-step learning paths",
    howToGuides: "Solutions to specific problems",
    reference: "Complete technical details",
    explanation: "Background and concepts",
  },
};
```

### SSG-Specific Adaptations

```typescript
interface SSGDiataxisAdapter {
  generateStructure(
    ssg: SSGType,
    project: ProjectAnalysis,
  ): DiataxisImplementation;
  createNavigation(
    ssg: SSGType,
    structure: DiataxisStructure,
  ): NavigationConfig;
  generateTemplates(ssg: SSGType, contentTypes: ContentType[]): TemplateSet;
}

class HugoDiataxisAdapter implements SSGDiataxisAdapter {
  generateStructure(
    ssg: SSGType,
    project: ProjectAnalysis,
  ): DiataxisImplementation {
    return {
      contentDirectories: this.createHugoContentStructure(),
      frontmatterSchemas: this.createHugoFrontmatter(),
      taxonomies: this.createDiataxisTaxonomies(),
      menuConfiguration: this.createHugoMenus(),
    };
  }

  createHugoContentStructure(): ContentStructure {
    return {
      "content/tutorials/": { weight: 10, section: "tutorials" },
      "content/how-to/": { weight: 20, section: "guides" },
      "content/reference/": { weight: 30, section: "reference" },
      "content/explanation/": { weight: 40, section: "explanation" },
    };
  }
}
```

## Quality Assurance

### Diataxis Compliance Validation

```typescript
interface DiataxisValidator {
  validateStructure(documentation: DocumentationStructure): ValidationResult;
  checkContentTypeAlignment(
    content: Content,
    declaredType: ContentType,
  ): AlignmentResult;
  identifyMissingCategories(structure: DocumentationStructure): Gap[];
}

function validateDiataxisCompliance(
  docs: DocumentationStructure,
): ComplianceReport {
  return {
    structureCompliance: checkDirectoryOrganization(docs),
    contentTypeAccuracy: validateContentCategorization(docs),
    navigationClarity: assessNavigationEffectiveness(docs),
    crossReferenceCompleteness: checkContentRelationships(docs),
  };
}
```

### Content Quality Guidelines

- **Tutorial Content**: Must include learning objectives, prerequisites, and verification steps
- **How-to Content**: Must focus on specific problems with clear solution steps
- **Reference Content**: Must be comprehensive, accurate, and systematically organized
- **Explanation Content**: Must provide context, background, and conceptual understanding

### Testing Strategy

- **Structure Tests**: Validate directory organization and navigation generation
- **Template Tests**: Ensure all content type templates are properly formatted
- **Integration Tests**: Test complete Diataxis implementation across different SSGs
- **User Experience Tests**: Validate that users can effectively navigate and find content

## Educational Integration

### User Guidance

- **Diataxis Explanation**: Clear documentation of framework benefits and principles
- **Content Type Guidelines**: Detailed guidance for creating each type of content
- **Migration Assistance**: Help converting existing documentation to Diataxis structure
- **Best Practice Examples**: Templates and examples demonstrating effective implementation

### Community Building

- **Diataxis Advocacy**: Promote framework adoption across open-source community
- **Success Story Sharing**: Highlight projects benefiting from Diataxis implementation
- **Training Resources**: Develop educational materials for technical writers and maintainers
- **Feedback Collection**: Gather community input for framework implementation improvements

## Future Enhancements

### Advanced Features

- **Content Gap Analysis**: AI-powered identification of missing content areas
- **User Journey Optimization**: Intelligent linking between content types based on user flows
- **Content Quality Scoring**: Automated assessment of content quality within each category
- **Personalized Navigation**: Adaptive navigation based on user role and experience level

### Tool Integration

- **Analytics Integration**: Track how users navigate between different content types
- **Content Management**: Tools for maintaining Diataxis compliance over time
- **Translation Support**: Multi-language implementations of Diataxis structure
- **Accessibility Features**: Ensure Diataxis implementation supports accessibility standards

## Implementation Status

**Status**: ✅ Implemented (2025-12-12)

**Implementation Files**:

- `src/tools/populate-content.ts` - Diataxis content population engine
- `src/prompts/technical-writer-prompts.ts` - Diataxis-aware prompt generation
- `src/utils/drift-detector.ts` - Diataxis type tracking in code examples
- `docs/tutorials/`, `docs/how-to/`, `docs/reference/`, `docs/explanation/` - Diataxis structure in use

**Key Features Implemented**:

- ✅ Automated Diataxis structure generation
- ✅ Content type templates (tutorials, how-to guides, reference, explanation)
- ✅ Content planning intelligence based on project analysis
- ✅ SSG-specific Diataxis adaptations
- ✅ Diataxis type tracking in code examples (Phase 3 enhancement)
- ✅ Navigation generation aligned with Diataxis principles

**Validation**: The framework is actively used in the documentation structure and content generation tools. Code examples include Diataxis type information for context-aware validation.

## References

- [Diataxis Framework Official Documentation](https://diataxis.fr/)
- [Information Architecture Principles](https://www.usability.gov/what-and-why/information-architecture.html)
- [Technical Writing Best Practices](https://developers.google.com/tech-writing)
- Commit: 9bbac23 - feat: Add Diataxis type tracking to CodeExample interface (#81)
- GitHub Issue: #81 - Diataxis type tracking to CodeExample interface
