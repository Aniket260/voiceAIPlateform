import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionsModule } from './sessions.module';

// Root module wires database connectivity and feature modules.
@Module({
  imports: [
    // Uses MONGODB_URI when available, otherwise local default.
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/voice-ai'),
    SessionsModule
  ]
})
export class AppModule {}
