CREATE DATABASE "orderJi";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE cafe (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    openStatus BOOLEAN DEFAULT true,
    image VARCHAR(200000),
    items UUID [],
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    upiId VARCHAR(100) UNIQUE,
    reviewLink VARCHAR(100),
    rating FLOAT DEFAULT 5,
    ratingCount INT DEFAULT 1,
    fssaiCertificate VARCHAR(200000),
    upiQRCode VARCHAR(200000),
    fssai VARCHAR(15),
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE admin (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(100),
    provider VARCHAR(100),
    cafe UUID REFERENCES cafe(_id),
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100) NOT NULL,
    pin VARCHAR(100) NOT NULL,
    image VARCHAR(200000),
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE item (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe UUID REFERENCES cafe(_id),
    category VARCHAR(100) NOT NULL,
    subCategory VARCHAR(100),
    name VARCHAR(100) NOT NULL,
    price FLOAT NOT NULL,
    description VARCHAR(1000) NOT NULL,
    foodChoice VARCHAR(100),
    recommended BOOLEAN NOT NULL DEFAULT false,
    inStock BOOLEAN NOT NULL DEFAULT true,
    variant VARCHAR(100),
    servingInfo VARCHAR(100),
    portionSize VARCHAR(100),
    tags VARCHAR(100),
    image VARCHAR(200000),
    veg BOOLEAN NOT NULL DEFAULT true,
    orderedCount INT DEFAULT 0,
    rating FLOAT DEFAULT 5,
    ratingCount INT DEFAULT 1,
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE USERBASE (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    city VARCHAR(100),
    cafeVisited UUID [],
    orders UUID [],
    topics VARCHAR(100) [],
    VAPIDPublicKey VARCHAR(1000),
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE orderItem (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item UUID REFERENCES item(_id),
    variant VARCHAR(100) DEFAULT 'Regular',
    quantity INT NOT NULL DEFAULT 1,
    price FLOAT NOT NULL,
    customer VARCHAR REFERENCES USERBASE(phone),
    rating INT,
    review VARCHAR(100)
);
CREATE TYPE orderType as ENUM ('DINEIN', 'DELIVERY', 'TAKEAWAY');
CREATE TYPE status as ENUM (
    'INITIALISED',
    'ORDERED',
    'REJECTED',
    'PREPARING',
    'PREPARED',
    'SERVED',
    'DINING',
    'COMPLETED'
);
CREATE TABLE orders (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe UUID REFERENCES cafe(_id),
    tableNumber VARCHAR(100) NOT NULL,
    status status NOT NULL DEFAULT 'INITIALISED',
    paymentStatus BOOLEAN NOT NULL DEFAULT false,
    amount FLOAT NOT NULL DEFAULT 0,
    items UUID [],
    customer VARCHAR(15) REFERENCES USERBASE(phone),
    orderType orderType NOT NULL DEFAULT 'DINEIN',
    note VARCHAR(1000),
    rating INT,
    review VARCHAR(500),
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE alerts (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe UUID REFERENCES cafe(_id),
    title VARCHAR(1000),
    body VARCHAR(1000),
    topics VARCHAR(100) [],
    discount FLOAT,
    expiry TIMESTAMP,
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);
CREATE TABLE repeatorders (
    _id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafe UUID REFERENCES cafe(_id),
    orders UUID [],
    createdAt TIMESTAMP DEFAULT timezone('ist', now()),
    updatedAt TIMESTAMP DEFAULT timezone('ist', now())
);