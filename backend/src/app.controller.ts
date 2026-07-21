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
  createClient(@Body() body: any) {
    return this.appService.createClient(body);
  }

  @Put('clients/:id')
  updateClient(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateClient(id, body);
  }

  @Get('quotations')
  getQuotations() {
    return this.appService.getQuotations();
  }

  @Post('quotations')
  createQuotation(@Body() body: any) {
    return this.appService.createQuotation(body);
  }

  @Put('quotations/:id')
  updateQuotation(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateQuotation(id, body);
  }

  @Get('projects')
  getProjects() {
    return this.appService.getProjects();
  }

  @Put('projects/:id')
  updateProjectStatus(@Param('id') id: string, @Body() body: any) {
    return this.appService.updateProjectStatus(id, body.status);
  }

  @Put('projects/:projectId/items/:itemId')
  updateProjectItem(@Param('projectId') projectId: string, @Param('itemId') itemId: string, @Body() body: any) {
    return this.appService.updateProjectItem(projectId, itemId, body);
  }

  @Get('billing')
  getBilling() {
    return this.appService.getBilling();
  }

  @Post('quotations/:id/convert')
  convertQuotation(@Param('id') id: string) {
    return this.appService.convertQuotation(id);
  }
}
