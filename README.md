  # Smart Restaurant System

  ![C#](https://img.shields.io/badge/C%23-Backend-512BD4?style=for-the-badge&logo=csharp)
  ![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-Web_API-5C2D91?style=for-the-badge&logo=dotnet)
  ![React](https://img.shields.io/badge/React-Frontend-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![TypeScript](https://img.shields.io/badge/TypeScript-Client-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![Vite](https://img.shields.io/badge/Vite-Dev_Server-646CFF?style=for-the-badge&logo=vite&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

  A full-stack restaurant management platform for handling restaurants, staff, tables, reservations, menu items, orders, kitchen workflow, inventory, reports, and tenant-based administration.

  The project is built as a separated client-server system:

  ```txt
  srs.Server   -> ASP.NET Core Web API
  srs.client   -> React + TypeScript + Vite
  ```

  ---

  ## What This Project Does

  Smart Restaurant System digitalizes the daily workflow of a restaurant.

  It connects the main parts of restaurant operations:

  ```txt
  Admin setup -> Restaurant management -> Table seating -> Ordering -> Kitchen queue -> Reports
  ```

  The system is designed for multiple roles, multiple restaurants, and tenant-based access, meaning one platform can support more than one restaurant business while keeping their data separated.

  ---

  ## Main Features

  | Area | Description |
  |---|---|
  | Authentication | Login and user identity through Supabase/JWT flow |
  | Tenants | Business-level separation for different restaurant groups |
  | Restaurants | Create and manage restaurants under tenants |
  | Staff | Assign managers, waiters, hosts, kitchen users, and other workers |
  | Tables | Manage table numbers, capacity, status, and assignments |
  | Reservations | Create, update, and assign reservations to tables |
  | Menu | Manage menus and menu items with price, category, and availability |
  | Orders | Create table orders and connect them to order items |
  | Kitchen Queue | Send order items to kitchen and track preparation status |
  | Inventory | Manage restaurant stock, suppliers, and inventory items |
  | Reports | View operational and business statistics |
  | Audit Logs | Track important actions made inside the system |
  | Superadmin | Manage the platform at the highest level |

  ---

  ## System Architecture

  ```mermaid
  flowchart LR
      A["React Client<br/>srs.client"] -->|"HTTP / REST API"| B["ASP.NET Core API<br/>srs.Server"]
      B --> C["Entity Framework Core"]
      C --> D["Relational Database"]
      A --> E["Supabase Auth"]
      B --> E
      B --> F["Role + Tenant Authorization"]

      style A fill:#61DAFB,stroke:#0B7285,color:#000
      style B fill:#512BD4,stroke:#2B145A,color:#fff
      style D fill:#F59F00,stroke:#7C4A00,color:#000
      style E fill:#3ECF8E,stroke:#087F5B,color:#000
  ```

  The frontend handles user interaction.  
  The backend handles business logic, authorization, tenant validation, and database access.

  ---

  ## Core Workflow

  ```mermaid
  flowchart TD
      A["Tenant Created"] --> B["Restaurant Created"]
      B --> C["Staff Added"]
      B --> D["Tables Created"]
      B --> E["Menu + Items Added"]
      D --> F["Host Seats Customer"]
      E --> G["Waiter / Table POS Creates Order"]
      F --> G
      G --> H["Order Items Sent to Kitchen Queue"]
      H --> I["Kitchen Prepares Order"]
      I --> J["Order Marked Ready"]
      J --> K["Waiter Serves Table"]
      K --> L["Reports Updated"]

      style A fill:#E7F5FF,stroke:#1971C2
      style G fill:#FFF3BF,stroke:#E67700
      style H fill:#FFE3E3,stroke:#C92A2A
      style L fill:#D3F9D8,stroke:#2B8A3E
  ```

  ---

  ## Roles

  | Role | Main Responsibility |
  |---|---|
  | SuperAdmin | Controls the whole platform |
  | Admin | Manages tenant-level setup |
  | Owner | Views restaurants, reports, and business performance |
  | Manager | Manages daily restaurant operations |
  | Host / Hostess | Handles tables, seating, and reservations |
  | Waiter | Creates and manages orders for tables |
  | Kitchen | Processes orders from the kitchen queue |
  | Table POS | Allows table-based ordering |

  ---

  ## Role Access Overview

  ```mermaid
  flowchart LR
      SA["SuperAdmin"] --> T["Tenants"]
      SA --> R["All Restaurants"]
      A["Admin"] --> R2["Tenant Restaurants"]
      O["Owner"] --> Reports["Reports"]
      M["Manager"] --> Ops["Staff / Tables / Menu / Inventory"]
      H["Host"] --> Seat["Reservations / Seating"]
      W["Waiter"] --> Orders["Orders"]
      K["Kitchen"] --> Queue["Kitchen Queue"]
      POS["Table POS"] --> Menu["Menu + Cart"]

      style SA fill:#212529,color:#fff
      style M fill:#364FC7,color:#fff
      style W fill:#0B7285,color:#fff
      style K fill:#C92A2A,color:#fff
      style POS fill:#F59F00,color:#000
  ```

  ---

  ## Backend Structure

  ```txt
  srs.Server/
  ├── Controllers/       # API endpoints
  ├── Services/          # Business logic
  ├── Dtos/              # Request/response models
  ├── Models/            # Database entities
  ├── Data/              # DbContext and database setup
  ├── Migrations/        # Entity Framework migrations
  ├── Middleware/        # Custom request/auth handling
  ├── Program.cs         # API startup
  └── appsettings.json   # Configuration
  ```

  Main backend modules:

  ```txt
  Auth
  Users
  Tenants
  Restaurants
  Staff
  Tables
  Reservations
  Menu
  MenuItems
  Orders
  OrderItems
  KitchenQueue
  Inventory
  InventoryItems
  Suppliers
  Reports
  AuditLogs
  Superadmin
  ```

  ---

  ## Frontend Structure

  ```txt
  srs.client/
  ├── src/
  │   ├── admin/         # Admin-specific views
  │   ├── app/           # App shell/routing
  │   ├── components/    # Reusable UI components
  │   ├── context/       # Auth and app context
  │   ├── hooks/         # Custom hooks
  │   ├── lib/           # API client, helpers, Supabase setup
  │   ├── pages/         # Main pages
  │   ├── styles/        # Styling
  │   └── superadmin/    # SuperAdmin views
  ├── package.json
  ├── vite.config.ts
  └── index.html
  ```

  ---

  ## Data Model Overview

  ```mermaid
  erDiagram
      TENANT ||--o{ USER : has
      TENANT ||--o{ RESTAURANT : owns
      RESTAURANT ||--o{ STAFF : employs
      RESTAURANT ||--o{ TABLE : contains
      RESTAURANT ||--o{ MENU : has
      MENU ||--o{ MENU_ITEM : includes
      TABLE ||--o{ RESERVATION : receives
      TABLE ||--o{ ORDER : creates
      ORDER ||--o{ ORDER_ITEM : contains
      ORDER_ITEM ||--o{ KITCHEN_QUEUE : enters
      RESTAURANT ||--o{ INVENTORY : has
      INVENTORY ||--o{ INVENTORY_ITEM : stores
      RESTAURANT ||--o{ SUPPLIER : uses
      USER ||--o{ AUDIT_LOG : creates
  ```

  ---

  ## Authentication Flow

  ```mermaid
  sequenceDiagram
      participant User
      participant Frontend
      participant Supabase
      participant Backend
      participant Database

      User->>Frontend: Login
      Frontend->>Supabase: Authenticate user
      Supabase-->>Frontend: JWT session
      Frontend->>Backend: Request with Bearer token
      Backend->>Supabase: Validate identity
      Backend->>Database: Load local user role + tenant
      Database-->>Backend: User context
      Backend-->>Frontend: Authorized response
  ```

  Supabase handles identity.  
  The backend handles application permissions.

  ---

  ## API Concept

  The backend follows REST-style endpoint groups:

  ```txt
  /api/auth
  /api/users
  /api/tenants
  /api/restaurants
  /api/staff
  /api/tables
  /api/reservations
  /api/menu
  /api/menu-items
  /api/orders
  /api/order-items
  /api/kitchen-queue
  /api/inventory
  /api/inventory-items
  /api/suppliers
  /api/reports
  /api/audit-logs
  /api/superadmin
  ```

  Typical operations:

  ```http
  GET    /api/restaurants
  POST   /api/restaurants
  GET    /api/restaurants/{id}
  PUT    /api/restaurants/{id}
  DELETE /api/restaurants/{id}
  ```

  Important rule:

  ```txt
  The frontend can send IDs, but the backend must verify tenant and role access.
  ```

  ---

  ## Installation

  ### Prerequisites

  Install:

  - .NET SDK
  - Node.js
  - npm
  - Database server
  - Git
  - Supabase project, if using Supabase auth

  ---

  ## Run Backend

  ```bash
  cd srs.Server
  dotnet restore
  dotnet build
  dotnet run
  ```

  ---

  ## Run Frontend

  ```bash
  cd srs.client
  npm install
  npm run dev
  ```

  Vite usually runs on:

  ```txt
  http://localhost:5173
  ```

  ---

  ## Environment Variables

  Backend examples:

  ```txt
  User Secrets:
  ConnectionStrings__DefaultConnection=
  Supabase__Url=
  Supabase__JwtSecret=
  Supabase__ServiceRoleKey=
  Jwt__Issuer=
  Jwt__Audience=
  OpenAI:APIKey
  Redis
  ```

  Do not commit real secrets.

  ---

  ## Database Migrations

  ```bash
  dotnet ef database update
  ```

  If `dotnet ef` is missing:

  ```bash
  dotnet tool install --global dotnet-ef
  ```

