# 🚀 **Innovation Excellence Tracking Portal**

Hackathon Project for **HackFusion 2025**

## 🛠️ **Tech Stack & Libraries Used**

- **AI Integration:**
  - `@google/generative-ai` → Utilized for AI-powered query resolution and assistance.
- **Data Visualization:**
  - `chart.js` → Used to generate interactive charts for visualizing innovation data.
- **Authentication & Authorization:**
  - `express-session` → For session management.
  - `bcryptjs` → For password hashing.
  - `jsonwebtoken (JWT)` → For secure token-based authentication.
- **Database & Storage:**
  - `MongoDB` → To store user, innovation, and hackathon data.
  - `Multer` → For local file uploads and storage (e.g., proposals, documents).
- **Front-End Rendering:**
  - `EJS (Embedded JavaScript)` → For dynamic front-end rendering.

## ⚙️ **Project Features**

- 🌐 **Role-Based Dashboard:** Separate dashboards for Admin, Faculty, and Students with relevant permissions and features.
- 📊 **Data Visualization:** Interactive charts and graphs showcasing category-wise innovation distribution.
- 🔐 **Secure Authentication:** Secure user login with session management and password hashing.
- 📥 **File Uploads:** Upload and manage innovation proposals and related documents.
- 🔍 **AI-Powered Chatbot:** AI assistant to help students with project-related queries.
- 🚀 **Admin Controls:** Manage, approve, and reject innovations. Post and manage hackathons.

## 📄 **How to Run Locally**

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Aryannnn-n/Innovation-Tracker.git
   cd Innovation-Tracker
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**

   - Create a `.env` file in the root directory and add the following:

   ```env
   MONGO_URI=<your-mongodb-uri>
   JWT_SECRET=<your-secret-key>
   SESSION_SECRET=<your-session-secret>
   GOOGLE_GEMINI_KEY=<key>
   ```

 
4. **Start the Server:**

   ```bash
   nodemon app.js
   ```

5. **Access the App:**
   - Open `http://localhost:3000` in your browser.

## 📂 **Project Structure**

```
/public         → Static assets (CSS, JS, images)
/views          → EJS templates for front-end rendering
/models         → Mongoose models for MongoDB collections
/routes         → Express routes for API endpoints
/uploads        → Directory for local file uploads
/app.js         → Main server file
```

## 🚀 **Contributors**

- **[Aryan Chavan](https://github.com/Aryannnn-n)** → Backend Developer
- **[Keshav Potewar](https://github.com/keshavpotewar)** → Backend Developer
- **[Amol Sonawane](https://github.com/AmolRS333)** → Frontend Developer

---
