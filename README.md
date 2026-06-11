# Campaign Copilot - AI-Native Mini CRM

An AI-native Mini CRM built for intelligent shopper engagement. The platform helps brands manage customers, segment audiences, create personalized campaigns, simulate multi-channel delivery, and analyze communication performance.

## Features

* Customer Management
* Order Management
* Audience Segmentation
* AI Copilot for Campaign Generation
* Campaign Lifecycle Management
* Delivery Simulation Center
* Analytics Dashboard
* Activity Logs and Notifications
* User Authentication
* Dark Mode
* Profile Management
* Multi-user Data Isolation

## Architecture

Frontend (React + Vite)

↓

Backend (Express)

↓

Supabase

Campaign

↓

Channel Service

↓

Callback Receipt API

↓

communication_logs + campaign_events

↓

Analytics Dashboard


Gemini AI

↓

Hybrid CRM Copilot


## Tech Stack

### Frontend

* React
* TypeScript
* TailwindCSS
* React Query
* Zustand

### Backend

* Node.js
* Express.js

### Database

* Supabase

### AI

* Google Gemini API

### Deployment

* Vercel
* Railway

## Folder Structure

campaign-copilot-ai-native-crm
├── frontend
├── backend
├── channel-service
└── schema.sql

## Key Features

### AI Copilot

Generates campaign ideas, drafts messages, and provides CRM insights.

### Delivery Center

Simulates Email, WhatsApp, SMS, and Push delivery while updating analytics through callback-driven communication events.

### Analytics

Tracks sent, delivered, opened, clicked, converted and revenue metrics.

### User Isolation

Every authenticated user gets an independent workspace.

## Setup

### Frontend

cd frontend

npm install

npm run dev

### Backend

cd backend

npm install

npm run dev

### Channel Service

cd channel-service

npm install

npm run dev

## Scale Assumptions

Built for demonstration purposes with moderate traffic.

At larger scale, asynchronous queues, caching, retries, and distributed processing would be introduced.

## AI-Native Workflow

AI was used extensively throughout development to accelerate implementation, generate components, improve architecture, and iterate rapidly. All generated outputs were reviewed, refined, tested, and integrated manually.
