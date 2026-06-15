import { Application, DesignPlan, DesignComponent } from '@unifiedaitoolbox/shared';

export class DesignPlanGenerator {
  generateFromApplication(application: Application): Omit<DesignPlan, 'id' | 'createdAt' | 'updatedAt'> {
    const components = this.generateComponents(application);
    const overview = this.generateOverview(application);
    const architecture = this.generateArchitecture(application, components);
    const tradeoffs = this.generateTradeoffs(application);
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
    return `Design plan for "${application.name}". This application aims to ${application.goal}. ` +
           `It must satisfy ${reqCount} key requirements and serve ${application.targetAudience || 'general users'}. ` +
           `The design breaks down the application into modular components with clear responsibilities ` +
           `and communication patterns.`;
  }

  private generateArchitecture(application: Application, components: DesignComponent[]): string {
    const compNames = components.map(c => c.name).join(', ');
    return `Layered architecture with ${components.length} primary components: ${compNames}. ` +
           `Component communication via well-defined interfaces. ` +
           `Persistence abstracted through repository pattern. ` +
           `Cross-cutting concerns (logging, validation, error handling) centralized. ` +
           `Constraints: ${application.constraints?.join(', ') || 'none specified'}.`;
  }

  private generateComponents(application: Application): DesignComponent[] {
    const components: DesignComponent[] = [];

    // Always include core components
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

    // Add domain-specific components based on requirements
    const requirementLowercase = application.requirements.join(' ').toLowerCase();

    if (requirementLowercase.includes('auth') || requirementLowercase.includes('user')) {
      components.push({
        name: 'Authentication Service',
        description: 'User authentication and authorization',
        responsibility: 'Manage user credentials, sessions, and access control',
        interfaces: ['OAuth2', 'JWT'],
      });
    }

    if (requirementLowercase.includes('notification') || requirementLowercase.includes('alert')) {
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

  private generateTradeoffs(application: Application): string[] {
    return [
      'Monolithic architecture prioritizes simplicity and startup speed over horizontal scalability. Recommend microservices if request volume exceeds 10K/min.',
      'File-based persistence chosen for initial phases for simplicity. Plan migration to database (PostgreSQL/MongoDB) before production at scale.',
      'Synchronous request handling keeps code simple but may impact latency under high concurrency. Consider async job queues (Bull/RabbitMQ) for long-running ops.',
      'Single-threaded event loop suitable for I/O-bound operations. Consider clustering for CPU-bound workloads.',
    ];
  }

  private generateRecommendations(application: Application): string[] {
    const constraints = (application.constraints || []).join(' ').toLowerCase();
    const recommendations: string[] = [];

    recommendations.push(
      'Implement structured logging from the start (Winston/Pino) with correlation IDs for tracing.',
      'Set up health checks and graceful shutdown handlers before deploying to production.',
      'Create API documentation (OpenAPI/Swagger) alongside implementation.',
      'Establish error handling standards and failure recovery patterns early.'
    );

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

    if (constraints.includes('reliability') || constraints.includes('availability')) {
      recommendations.push(
        'Implement circuit breakers for external service calls.',
        'Set up automated backups and disaster recovery.',
        'Create runbooks for common failure scenarios.'
      );
    }

    return recommendations;
  }
}
