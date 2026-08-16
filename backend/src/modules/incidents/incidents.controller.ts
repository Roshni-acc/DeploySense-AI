import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { IncidentsService } from './incidents.service';

@Controller('api/v1/incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  async getAllIncidents() {
    return this.incidentsService.getAllIncidents();
  }

  @Get('metrics')
  async getMetrics() {
    return this.incidentsService.getIncidentMetrics();
  }

  @Get(':id')
  async getIncidentById(@Param('id') id: string) {
    return this.incidentsService.getIncidentById(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' },
  ) {
    return this.incidentsService.updateIncidentStatus(id, body.status);
  }
}
