import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Body, 
  UseGuards, 
  Request, 
  Param,
  Query,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ContactService } from './contact.service';
import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator';

export class RequestContactDto {
  @IsNumber()
  scanId: number;

  @IsEmail()
  requesterEmail: string;

  @IsString()
  requesterName: string;

  @IsOptional()
  @IsString()
  message?: string;
}

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('request')
  async requestContact(@Body() requestContactDto: RequestContactDto) {
    return this.contactService.requestContact(
      requestContactDto.scanId,
      requestContactDto.requesterEmail,
      requestContactDto.requesterName,
      requestContactDto.message,
    );
  }

  @Get('requests')
  @UseGuards(AuthGuard('jwt'))
  async getContactRequests(@Request() req, @Query('status') status?: string) {
    return this.contactService.getContactRequests(req.user.id, status);
  }

  @Put('requests/:id/approve')
  @UseGuards(AuthGuard('jwt'))
  async approveContactRequest(@Request() req, @Param('id') contactRequestId: string) {
    return this.contactService.approveContactRequest(
      parseInt(contactRequestId),
      req.user.id,
    );
  }

  @Put('requests/:id/reject')
  @UseGuards(AuthGuard('jwt'))
  async rejectContactRequest(@Request() req, @Param('id') contactRequestId: string) {
    return this.contactService.rejectContactRequest(
      parseInt(contactRequestId),
      req.user.id,
    );
  }
}