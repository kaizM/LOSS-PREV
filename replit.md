# Loss Prevention Dashboard

## Overview

This is a full-stack loss prevention application designed for retail and gas station environments. The system integrates POS (Point of Sale) data analysis with video surveillance capabilities to automatically detect and flag suspicious transactions. It features a React frontend with shadcn/ui components and a Node.js/Express backend using PostgreSQL for data storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions stored in PostgreSQL
- **File Uploads**: Multer for handling POS data and video uploads

### Deployment Strategy
- **Development**: Vite dev server with Express API proxy
- **Production**: Static files served by Express with API routes
- **Database**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Database Schema
The application uses several core tables:
- **users**: Stores user authentication data (Replit Auth integration)
- **transactions**: POS transaction data with flagging status
- **videoClips**: Video file metadata linked to transactions
- **notes**: Manager notes and annotations for transactions
- **auditLogs**: Audit trail for all system actions
- **sessions**: Session storage for authentication

### Transaction Processing
- **POS Data Import**: CSV file upload and parsing with automatic flagging
- **Flagging Logic**: Detects suspicious transaction types (refunds, voids, cancellations, etc.)
- **Status Management**: Transactions flow through pending → approved/investigate/escalate states
- **Video Integration**: Links video clips to flagged transactions for review

### Authentication & Authorization
- **Replit Auth**: OpenID Connect integration for secure authentication
- **Session Management**: Server-side sessions with PostgreSQL storage
- **Role-based Access**: Manager role system with store-specific access

### File Management
- **Upload Directory**: Local file storage for POS data and video files
- **File Processing**: CSV parsing for POS data with transaction validation
- **Video Storage**: MP4 file upload and metadata storage

## Data Flow

1. **Authentication**: Users authenticate via Replit Auth OIDC flow
2. **POS Data Upload**: Managers upload CSV files containing transaction data
3. **Automatic Flagging**: System processes transactions and flags suspicious activities
4. **Video Association**: Video clips are uploaded and linked to flagged transactions
5. **Review Workflow**: Managers review flagged transactions with associated video footage
6. **Status Updates**: Transactions are marked as approved, investigate, or escalate
7. **Audit Trail**: All actions are logged for compliance and tracking

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database
- **Connection Pool**: @neondatabase/serverless for WebSocket connections
- **Drizzle ORM**: Type-safe database operations and migrations

### Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Session Storage**: PostgreSQL-backed session management

### UI Components
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library for UI elements

### File Processing
- **CSV Parser**: For processing POS data files
- **Multer**: File upload middleware
- **Date-fns**: Date manipulation and formatting

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express API server with automatic restarts
- Database migrations via Drizzle Kit
- Replit integration with cartographer plugin

### Production Build
- Vite builds static assets to `dist/public`
- ESBuild bundles server code to `dist/index.js`
- Environment variables for database and auth configuration
- Static file serving through Express

### Database Management
- Drizzle migrations stored in `./migrations`
- Schema definitions in `./shared/schema.ts`
- Push-based schema updates via `drizzle-kit push`

The application is designed to be deployed on Replit with automatic database provisioning and authentication integration, but can be adapted for other deployment platforms by adjusting the authentication and database configuration.

## Recent Changes

### July 10, 2025 - Enhanced Features and Camera Integration
- Added comprehensive CSV export functionality for transaction data
- Implemented camera system integration with DVR support
- Created tabbed interface for better navigation (Transactions, Upload Data, Camera System)
- Enhanced filtering system with auto-apply functionality
- Improved error handling and user feedback throughout the application
- Added upload progress indicators and better file validation
- Integrated with user's ALI-QVR5132H DVR system (32 channels)
- Added camera connection testing and configuration management
- Enhanced transaction modal with better video display and note management
- Improved UI/UX with loading states and better responsive design

### July 10, 2025 - Migration from Replit Agent to Replit Environment
- Successfully migrated project from Replit Agent to standard Replit environment
- Created PostgreSQL database with proper connection configuration
- Set up database schema with all required tables (users, transactions, videoClips, notes, auditLogs, sessions)
- Added sample transaction data for testing and demonstration
- Fixed API routing issues with transaction ID validation
- Resolved query key formatting issues in React Query implementation
- Verified application functionality with working dashboard, statistics, and transaction management
- All core features operational: transaction filtering, status updates, and data visualization