# Carpool App

This is a full-stack carpooling application that allows users to register, log in, publish rides, search for rides, book seats, and manage booking requests and notifications.

## Features

- **User Authentication:** Register and log in securely.
- **Profile Management:** View and edit user profile.
- **Publish Rides:** Drivers can publish car or bike rides with detailed information.
- **Search Rides:** Passengers can search for available rides and book seats.
- **Booking Requests:** Passengers can send booking requests; drivers can accept or reject them.
- **Notifications:** Both drivers and passengers receive notifications for booking status changes.
- **Dashboard:** Quick access to user options and roles.
- **Responsive UI:** Clean, modern, and mobile-friendly interface.

## Folder Structure

```
slow/
  package.json
  server.js
  public/
    auth.css
    auth.js
    dashboard.html
    header.js
    index.html
    login.html
    notifications.html
    Passanger.html
    passenger-requests.html
    profile.html
    publish.html
    publisher.html
    register.html
    requests.html
    search.html
    server.js
    styles.css
```

### Key Files

- **server.js**: Main Express server, API endpoints, MongoDB models, authentication, and notification logic.
- **public/**: Static frontend files (HTML, CSS, JS).
  - **index.html**: Landing page.
  - **login.html / register.html**: Authentication pages.
  - **profile.html**: User profile page.
  - **publish.html**: Form to publish new rides.
  - **search.html**: Search and book available rides.
  - **notifications.html**: Driver notifications for booking requests.
  - **passenger-requests.html**: Passenger view of their booking requests.
  - **requests.html**: Tabbed view of active and past booking requests.
  - **dashboard.html**: User dashboard for role selection.
  - **auth.js**: Handles authentication logic and UI updates.
  - **header.js**: Shared header/navigation logic.
  - **styles.css / auth.css**: Main and authentication-specific styles.

##how to run
1. **Install dependencies*  
   In the `slow` directory:
   ```sh
   npm install
   ```

2. **Configure environment variables**  
   Create a `.env` file in `slow/` with MongoDB URI and (optionally) email/Twilio credentials for notifications.

3. **Start the server**  
   ```sh
   npm start
   ```
   or for development with auto-reload:
   ```sh
   npm run dev
   ```

4. **Access the app**  
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

- `POST /api/register` — Register a new user
- `POST /api/login` — User login
- `GET /api/profile` — Get current user's profile
- `POST /api/rides` — Publish a new ride
- `GET /api/rides` — List all rides
- `POST /api/rides/:rideId/book` — Book a ride
- `GET /api/booking-requests/user` — Get booking requests for the logged-in user
- `GET /api/rides/:rideId/booking-requests` — Get booking requests for a ride (driver)
- `POST /api/booking-requests/:requestId/respond` — Accept/reject a booking request

## Technologies Used

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Nodemailer, Twilio
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Other:** dotenv for configuration, bcryptjs for password hashing

## Notes

- All static files are served from the `public/` folder.
- For SMS/email notifications, configure the appropriate credentials in your `.env` file.
- The app is designed for educational/demo purposes and may require further security hardening for production use.

---

For more details, see the code in each file or contact the project maintainer.
