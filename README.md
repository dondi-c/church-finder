# Church Finder Application

A comprehensive web application that helps users discover local churches through advanced geolocation and intelligent search technologies. The platform enables users to find and explore local churches with cutting-edge mapping technologies and detailed service information.

## Features

- 🗺️ Interactive Google Maps Integration
- 🎯 Real-time Church Location Discovery
- ⛪ Detailed Church Information
  - Service Times
  - Denominations
  - Contact Information
  - Reviews & Ratings
- 📱 Responsive Design for All Devices
- 🔍 Search by Denomination
- 🗺️ Get Directions Feature

## Tech Stack

- **Frontend**
  - React with TypeScript
  - Tailwind CSS
  - shadcn/ui Components
  - React Query for Data Fetching
  - Wouter for Routing

- **Backend**
  - Node.js/Express
  - PostgreSQL Database
  - Drizzle ORM
  - Google Maps JavaScript API
  - Google Places API

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL Database
- Google Maps API Key

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=your_postgresql_database_url
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd church-finder
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
