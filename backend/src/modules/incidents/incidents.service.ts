import { transientIncidentsStore } from '../logs/logs.service';
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllIncidents() {
    try {
      const dbIncidents = await this.prisma.incident.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          deployment: true,
          notifications: true,
        },
      });
      return [...transientIncidentsStore, ...dbIncidents];
    } catch (e) {
      this.logger.warn(`Database unavailable for query, returning transient incidents list: ${e.message}`);
      return transientIncidentsStore;
    }
  }

  async getIncidentById(id: string) {
    try {
      const incident = await this.prisma.incident.findUnique({
        where: { id },
        include: {
          deployment: true,
          notifications: true,
        },
      });
      if (!incident) {
        throw new NotFoundException(`Incident with ID ${id} not found.`);
      }
      return incident;
    } catch (e) {
      throw new NotFoundException(`Incident with ID ${id} not found.`);
    }
  }

  async updateIncidentStatus(id: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED') {
    try {
      return await this.prisma.incident.update({
        where: { id },
        data: { status },
      });
    } catch (e) {
      throw new NotFoundException(`Incident with ID ${id} could not be updated.`);
    }
  }

  async getIncidentMetrics() {
    const tTotal = transientIncidentsStore.length;
    const tOpen = transientIncidentsStore.filter(i => i.status === 'OPEN').length;
    const tResolved = transientIncidentsStore.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
    const tCritical = transientIncidentsStore.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;

    try {
      const totalIncidents = await this.prisma.incident.count();
      const openIncidents = await this.prisma.incident.count({ where: { status: 'OPEN' } });
      const resolvedIncidents = await this.prisma.incident.count({ where: { status: 'RESOLVED' } });
      const criticalIncidents = await this.prisma.incident.count({ where: { severity: 'CRITICAL' } });

      return {
        totalIncidents: totalIncidents + tTotal,
        openIncidents: openIncidents + tOpen,
        resolvedIncidents: resolvedIncidents + tResolved,
        criticalIncidents: criticalIncidents + tCritical,
      };
    } catch (e) {
      return {
        totalIncidents: tTotal,
        openIncidents: tOpen,
        resolvedIncidents: tResolved,
        criticalIncidents: tCritical,
      };
    }
  }
}
