<h1>Ahmedabad Bus Seat Booking System</h1>

<p>
A full-stack bus seat booking platform built with React, Node.js, Express, and PostgreSQL.
</p>

<p align="center">

<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white"/>
<img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
<img src="https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Express.js-Backend-black?style=for-the-badge&logo=express"/>
<img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white"/>

<img src="https://img.shields.io/badge/Authentication-JWT-success?style=flat-square"/>
<img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square"/>
</p>

## Overview

Ahmedabad Bus Seat Booking System is a full booking platform that lets users search for buses, pick seats, and book tickets, while giving admins tools to manage routes, buses, and schedules.

Users can search available buses, view bus details, select seats interactively, book tickets securely, and manage their bookings.

Admins can manage buses and routes, view all bookings, update schedules, and control seat availability.

## Features

**User**
- Registration and login with JWT authentication
- Search buses by source and destination
- View bus details
- Interactive seat selection
- Passenger information form
- Booking confirmation with QR code ticket
- Booking history and cancellation

**Admin**
- Secure admin login
- Manage bus routes and buses
- Manage seat availability
- View all bookings
- Upload and manage route dataset

## Tech Stack

**Frontend:** React, Vite, React Router, Axios, React Icons, CSS

**Backend:** Node.js, Express.js, JWT authentication, Multer, Express Validator

**Database:** PostgreSQL

**DevOps:** Docker, Docker Compose

## Project Structure

```
Ahmedabad-Bus-Seat-Booking-System/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/
│   ├── src/
│   ├── db/
│   ├── data/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Installation

Clone the repo:

```bash
git clone https://github.com/dharmikd2905/Ahmedabad-Bus-Seat-Booking-System.git
cd Ahmedabad-Bus-Seat-Booking-System
```

**Using Docker:**

```bash
docker-compose up --build
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Backend:**

```bash
cd backend
npm install
npm run dev
```

## Environment Variables

Backend (`.env`):

```
PORT=
DATABASE_URL=
JWT_SECRET=
```

Frontend (`.env`):

```
VITE_API_URL=
```

## Application Screenshots

**Home Page**

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/94f2428d-b97a-47eb-98eb-a50309964400" />

**Search Results**

<img width="1710" height="588" alt="image" src="https://github.com/user-attachments/assets/f1a274a5-e7ba-4b45-be7d-ac8accd5b922" />

**Seat Selection**

<img width="1318" height="990" alt="image" src="https://github.com/user-attachments/assets/5a285860-e270-40b0-bdcc-8c8b06ba662e" />

**Login / Sign Up**

<img width="1191" height="705" alt="image" src="https://github.com/user-attachments/assets/91845684-b409-4a3a-85f1-358519b4cb18" />

**Booking Confirmation**

<img width="939" height="906" alt="image" src="https://github.com/user-attachments/assets/d84f2c42-0b04-466b-a968-7bb961420a03" />

**Admin Dashboard**

<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/e1f5e7d3-560f-485e-b218-840b093df374" />

## Booking Flow

A user logs in or registers, searches for a bus, and selects one from the results. From there they choose a seat, fill in passenger details, confirm the booking, and get a ticket they can view or download.

## Key Highlights

- Responsive UI
- JWT authentication
- Secure booking flow
- Interactive seat layout
- QR code ticket generation
- PostgreSQL database
- Dockerized deployment
- Clean, modular architecture

## License

This project was developed for academic purposes.

## Author

**Dharmik Dudhat**

B.Tech, Information & Communication Technology — Pandit Deendayal Energy University (PDEU)

[GitHub](https://github.com/dharmikd2905) · [LinkedIn](https://linkedin.com/in/dharmik-dudhat-66203b289)
