import { StackConstraints } from '@unifiedaitoolbox/shared';

const UNSPECIFIED = 'unspecified';

function joinList(values: string[] | undefined, fallback: string): string {
  if (!values || values.length === 0) {
    return fallback;
  }

  return values.join(', ');
}

export class StackConstraintBuilder {
  build(constraints?: StackConstraints): string {
    const language = constraints?.language || UNSPECIFIED;
    const runtime = constraints?.runtime || UNSPECIFIED;
    const framework = constraints?.framework || UNSPECIFIED;
    const dependencies = joinList(constraints?.dependencies, UNSPECIFIED);
    const fileStructure = joinList(constraints?.fileStructure, UNSPECIFIED);
    const disallowed = joinList(
      [
        ...(constraints?.disallowedLanguages || []),
        ...(constraints?.disallowedTechnologies || []),
      ],
      UNSPECIFIED
    );
    const additionalRequirements = joinList(
      constraints?.additionalRequirements,
      'none specified'
    );

    const lines = [
      '## Project Stack (REQUIRED - do not deviate)',
      `- Language: ${language}`,
      `- Runtime: ${runtime}`,
      `- Framework: ${framework}`,
      `- Dependencies available: ${dependencies}`,
      `- File structure: ${fileStructure}`,
      `- Do NOT use: ${disallowed}`,
      `- Additional requirements: ${additionalRequirements}`,
    ];

    if (constraints?.allowedLanguages?.length) {
      lines.push(`- Additional allowed languages: ${constraints.allowedLanguages.join(', ')}`);
    }

    if (constraints?.packageManifest?.trim()) {
      lines.push('', constraints.packageManifest.trim());
    }

    return lines.join('\n');
  }
}
