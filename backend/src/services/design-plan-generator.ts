import { Application, DesignPlan, DesignComponent } from '@unifiedaitoolbox/shared';
import { LLMClient } from './llm-client.js';

const SYSTEM_PROMPT = `You are an expert software architect. Given an application description,
produce a thorough design plan as a single JSON object.

The JSON must match this exact schema (no extra fields, no markdown prose outside the JSON):
{
  "overview": "string — 2-4 sentence summary of the application and design approach",
  "architecture": "string — description of system architecture, component interactions, and key patterns",
  "components": [
    {
      "name": "string",
      "description": "string",
      "responsibility": "string",
      "interfaces": ["string"]
    }
  ],
  "tradeoffs": ["string"],
  "recommendations": ["string"]
}

Rules:
- components must cover ALL aspects of the application (frontend, backend, data layer, auth, etc.)
- tradeoffs must be honest and specific to the app's requirements
- recommendations must be actionable engineering guidance
- Respond with ONLY the JSON object, no preamble or trailing text`;

export class DesignPlanGenerator {
  async generateFromApplication(
    application: Application
  ): Promise<Omit<DesignPlan, 'id' | 'createdAt' | 'updatedAt'>> {
    if (LLMClient.isAvailable()) {
      try {
        return await this.generateWithLLM(application);
      } catch (err) {
        console.warn('[DesignPlanGenerator] LLM call failed, falling back to template:', err);
      }
    }
    return this.generateFromTemplate(application);
  }

  private async generateWithLLM(
    application: Application
  ): Promise<Omit<DesignPlan, 'id' | 'createdAt' | 'updatedAt'>> {
    const client = new LLMClient();

    const userMessage = `Generate a design plan for this application:

Name: ${application.name}
Goal: ${application.goal}
Description: ${application.description}
Requirements:
${application.requirements.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}
${application.targetAudience ? `Target Audience: ${application.targetAudience}` : ''}
${application.constraints?.length ? `Constraints: ${application.constraints.join(', ')}` : ''}`;

    const result = await client.call({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 4096,
    });

    const jsonText = LLMClient.extractJSON(result.text);
    const parsed = JSON.parse(jsonText) as {
      overview: string;
      architecture: string;
      components: DesignComponent[];
      tradeoffs: string[];
      recommendations: string[];
    };

    // Validate required fields are present
    if (!parsed.overview || !parsed.architecture || !Array.isArray(parsed.components)) {
      throw new Error('LLM response missing required design plan fields');
    }

    console.log(
      `[DesignPlanGenerator] LLM generated plan: ${parsed.components.length} components, ` +
        `${result.inputTokens}→${result.outputTokens} tokens`
    );

    return {
      applicationId: application.id,
      overview: parsed.overview,
      architecture: parsed.architecture,
      components: parsed.components,
      tradeoffs: parsed.tradeoffs || [],
      recommendations: parsed.recommendations || [],
      status: 'draft',
    };
  }

  private generateFromTemplate(
    application: Application
  ): Omit<DesignPlan, 'id' | 'createdAt' | 'updatedAt'> {
    const components = this.generateComponents(application);
    const overview = this.generateOverview(application);
    const architecture = this.generateArchitecture(application, components);
    const tradeoffs = this.generateTradeoffs();
    const recommendations = this.generateRecommendations(application);

    return {
      applicationId: application.id,
      overview,
      architecture,
      components,
      tradeoffs,
      recommendations,
      status: 'draft',
    };
  }

  private generateOverview(application: Application): string {
    const reqCount = application.requirements.length;
    return (
      `Design plan for "${application.name}". This application aims to ${application.goal}. ` +
      `It must satisfy ${reqCount} key requirements and serve ${application.targetAudience || 'general users'}. ` +
      `The design breaks down the application into modular components with clear responsibilities ` +
      `and communication patterns.`
    );
  }

  private generateArchitecture(
    application: Application,
    components: DesignComponent[]
  ): string {
    const compNames = components.map(c => c.name).join(', ');
    return (
      `Layered architecture with ${components.length} primary components: ${compNames}. ` +
      `Component communication via well-defined interfaces. ` +
      `Persistence abstracted through repository pattern. ` +
      `Cross-cutting concerns (logging, validation, error handling) centralized. ` +
      `Constraints: ${application.constraints?.join(', ') || 'none specified'}.`
    );
  }

  private generateComponents(application: Application): DesignComponent[] {
    const components: DesignComponent[] = [];

    components.push({
      name: 'API Gateway',
      description: 'HTTP API entry point with request validation and routing',
      responsibility: 'Accept and route HTTP requests, validate schemas, return responses',
      interfaces: ['HTTP REST'],
    });

    components.push({
      name: 'Persistence Layer',
      description: 'Data storage and retrieval abstraction',
      responsibility: 'Create, read, update, delete operations with transactional consistency',
      interfaces: ['File I/O', 'Index Management'],
    });

    components.push({
      name: 'Validation Service',
      description: 'JSON Schema validation and type checking',
      responsibility: 'Ensure all data matches defined schemas before persistence',
      interfaces: ['Schema Registry'],
    });

    const requirementLowercase = application.requirements.join(' ').toLowerCase();

    if (requirementLowercase.includes('auth') || requirementLowercase.includes('user')) {
      components.push({
        name: 'Authentication Service',
        description: 'User authentication and authorization',
        responsibility: 'Manage user credentials, sessions, and access control',
        interfaces: ['OAuth2', 'JWT'],
      });
    }

    if (
      requirementLowercase.includes('notification') ||
      requirementLowercase.includes('alert')
    ) {
      components.push({
        name: 'Notification Service',
        description: 'User notifications and alerts',
        responsibility: 'Queue and deliver notifications across multiple channels',
        interfaces: ['Email', 'Webhook', 'In-App'],
      });
    }

    if (requirementLowercase.includes('search') || requirementLowercase.includes('query')) {
      components.push({
        name: 'Search Service',
        description: 'Full-text search and indexing',
        responsibility: 'Index data and execute complex search queries',
        interfaces: ['Search API', 'Index Builder'],
      });
    }

    if (requirementLowercase.includes('report') || requirementLowercase.includes('analytics')) {
      components.push({
        name: 'Analytics Engine',
        description: 'Data aggregation and reporting',
        responsibility: 'Collect metrics, generate reports, track KPIs',
        interfaces: ['Events API', 'Report Generator'],
      });
    }

    return components;
  }

  private generateTradeoffs(): string[] {
    return [
      'Monolithic architecture prioritizes simplicity and startup speed over horizontal scalability. Recommend microservices if request volume exceeds 10K/min.',
      'File-based persistence chosen for initial phases for simplicity. Plan migration to database (PostgreSQL/MongoDB) before production at scale.',
      'Synchronous request handling keeps code simple but may impact latency under high concurrency. Consider async job queues (Bull/RabbitMQ) for long-running ops.',
      'Single-threaded event loop suitable for I/O-bound operations. Consider clustering for CPU-bound workloads.',
    ];
  }

  private generateRecommendations(application: Application): string[] {
    const constraints = (application.constraints || []).join(' ').toLowerCase();
    const recommendations: string[] = [
      'Implement structured logging from the start (Winston/Pino) with correlation IDs for tracing.',
      'Set up health checks and graceful shutdown handlers before deploying to production.',
      'Create API documentation (OpenAPI/Swagger) alongside implementation.',
      'Establish error handling standards and failure recovery patterns early.',
    ];

    if (constraints.includes('compliance') || constraints.includes('security')) {
      recommendations.push(
        'Implement audit logging for all data modifications.',
        'Use encryption at rest for sensitive data.',
        'Regular security scanning and dependency updates.'
      );
    }

    if (constraints.includes('performance') || constraints.includes('latency')) {
      recommendations.push(
        'Implement response caching where appropriate.',
        'Profile and optimize hot paths.',
        'Set up performance monitoring and alerting.'
      );
    }

    return recommendations;
  }
}
