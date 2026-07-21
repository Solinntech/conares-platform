import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dashboard')
  getDashboard() {
    return this.appService.getDashboardSummary();
  }

  @Get('clients')
  getClients() {
    return this.appService.getClients();
  }

  @Post('clients')
  async createClient(@Body() body: any) {
    return await this.appService.createClient(body);
  }

  @Put('clients/:id')
  async updateClient(@Param('id') id: string, @Body() body: any) {
    return await this.appService.updateClient(id, body);
  }

  @Get('quotations')
  getQuotations() {
    return this.appService.getQuotations();
  }

  @Post('quotations')
  async createQuotation(@Body() body: any) {
    return await this.appService.createQuotation(body);
  }

  @Put('quotations/:id')
  async updateQuotation(@Param('id') id: string, @Body() body: any) {
    return await this.appService.updateQuotation(id, body);
  }

  @Get('projects')
  getProjects() {
    return this.appService.getProjects();
  }

  @Put('projects/:id')
  async updateProjectStatus(@Param('id') id: string, @Body() body: any) {
    return await this.appService.updateProjectStatus(id, body.status);
  }

  @Put('projects/:projectId/items/:itemId')
  async updateProjectItem(@Param('projectId') projectId: string, @Param('itemId') itemId: string, @Body() body: any) {
    return await this.appService.updateProjectItem(projectId, itemId, body);
  }

  @Get('billing')
  getBilling() {
    return this.appService.getBilling();
  }

  @Post('quotations/:id/convert')
  async convertQuotation(@Param('id') id: string) {
    return await this.appService.convertQuotation(id);
  }
}
