const http = require("http");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();
const booksDbPath = path.join(__dirname, "db", "books.json");
const usersDbPath = path.join(__dirname, "db", "users.json");

let booksDB = [];
let usersDB = [];

const PORT = process.env.PORT || 3000;
const HOST_NAME = "0.0.0.0";

const requestHandler = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/users/create" && req.method === "POST") {
    createUser(req, res);
  } else if (req.url === "/users/authenticate" && req.method === "POST") {
    authenticateUser(req, res);
  } else if (req.url === "/users" && req.method === "GET") {
    console.log(req.url);
    getAllUsers(req, res);
  } else if (req.url === "/books" && req.method === "GET") {
    getAllBooks(req, res);
  } else if (
    req.url === "/books/loan" &&
    (req.method === "POST" || req.method === "PUT")
  ) {
    loanOutBook(req, res);
  } else if (req.url === "/books/return" && req.method === "POST") {
    returnBook(req, res);
  } else if (req.url === "/books/add" && req.method === "POST") {
    createBook(req, res);
  } else if (req.url === "/books/update" && req.method === "PUT") {
    updateBook(req, res);
  } else if (
    req.url.startsWith("/books/delete?id=") &&
    req.method === "DELETE"
  ) {
    deleteBook(req, res);
  } else {
    res.writeHead(404);
    res.end(
      JSON.stringify({
        message: "Endpoint not found.",
        status: "failed",
      })
    );
  }
};

// GET ALL USERS ==> GET: /users
const getAllUsers = (req, res) => {
  return res.end(JSON.stringify(usersDB));
};

const createUser = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const newUser = JSON.parse(parsedBody);

    // Check if the username or email already exists in the database
    const existingUser = usersDB.find(
      (user) =>
        user.username === newUser.username || user.email === newUser.email
    );

    if (existingUser) {
      res.writeHead(400); // Bad Request
      res.end(
        JSON.stringify({
          message: "Username or email already exists",
        })
      );
      return;
    }

    // get ID of last user in the database
    const lastUser = usersDB[usersDB.length - 1];
    const lastUserId = lastUser ? lastUser.id : 0; // If no users exist, start ID from 0
    newUser.id = lastUserId + 1;

    //save to db
    usersDB.push(newUser);
    fs.writeFile(usersDbPath, JSON.stringify(usersDB), (err) => {
      if (err) {
        console.log(err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            message: "Internal Server Error. Could not save user to database.",
          })
        );
        return;
      }

      res.writeHead(201);
      res.end(JSON.stringify(newUser));
    });
  });
};

// GET ALL BOOKS ==> GET: /books
const getAllBooks = (req, res) => {
  return res.end(JSON.stringify(booksDB));
};

// CREATE A BOOK ==> POST: /books/add
const createBook = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString(); // concatenate raw data into a single buffer string
    const newBook = JSON.parse(parsedBody); // parse the buffer string into a JSON object

    // get ID of last book in the database
    const lastBook = booksDB[booksDB.length - 1];
    const lastBookId = lastBook.id;
    newBook.id = lastBookId + 1;

    //save to db
    booksDB.push(newBook);
    fs.writeFile(booksDbPath, JSON.stringify(booksDB), (err) => {
      if (err) {
        console.log(err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            message: "Internal Server Error. Could not save book to database.",
          })
        );
      }

      res.writeHead(201);
      res.end(JSON.stringify(newBook));
    });
  });
};

//Authenticate a User ===> POST: /users/authenticate
const authenticateUser = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const loginDetails = JSON.parse(parsedBody);

    // Find the user in the database
    const user = usersDB.find(
      (user) =>
        user.username === loginDetails.username &&
        user.password === loginDetails.password
    );

    if (!user) {
      res.writeHead(401); // Unauthorized
      res.end(
        JSON.stringify({
          message: "Username or password incorrect",
        })
      );
      return;
    }

    res.writeHead(200); // OK
    res.end(
      JSON.stringify({
        message: "Authentication successful",
        user: user,
      })
    );
  });
};

// UPDATE A BOOK ==> PUT: /books/update
const updateBook = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    // data event is fired when the server receives data from the client
    body.push(chunk); // push each data received to the body array
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString(); // concatenate raw data into a single buffer string
    const bookToUpdate = JSON.parse(parsedBody); // parse the buffer string into a JSON object

    // find the book in the database
    const bookIndex = booksDB.findIndex((book) => {
      return book.id === bookToUpdate.id;
    });

    // Return 404 if book not found
    if (bookIndex === -1) {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          message: "Book not found",
        })
      );
      return;
    }

    // update the book in the database
    booksDB[bookIndex] = { ...booksDB[bookIndex], ...bookToUpdate };

    // save to db
    fs.writeFile(booksDbPath, JSON.stringify(booksDB), (err) => {
      if (err) {
        console.log(err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            message:
              "Internal Server Error. Could not update book in database.",
          })
        );
      }

      res.end(JSON.stringify(bookToUpdate));
    });
  });
};

// LOAN OUT A BOOK ==> POST: /books/loan
const loanOutBook = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const loanDetails = JSON.parse(parsedBody);

    // find the book in the database
    const bookIndex = booksDB.findIndex((book) => {
      return book.id === loanDetails.bookId;
    });

    // Return 404 if book not found
    if (bookIndex === -1) {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          message: "Book not found",
        })
      );
      return;
    }
    // Check if the book is already loaned out
    if (booksDB[bookIndex].isLoanedOut) {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          message: "Book is already loaned out",
        })
      );
      return;
    }

    // update the book in the database
    booksDB[bookIndex].isLoanedOut = true;
    booksDB[bookIndex].loanee = loanDetails.loanee;

    // save to db
    fs.writeFile(booksDbPath, JSON.stringify(booksDB), (err) => {
      if (err) {
        console.log(err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            message:
              "Internal Server Error. Could not loan out book in database.",
          })
        );
      }

      res.end(JSON.stringify(booksDB[bookIndex]));
    });
  });
};

// Return a Loaned Out Book ==> POST: /book/return
const returnBook = (req, res) => {
  const body = [];

  req.on("data", (chunk) => {
    body.push(chunk);
  });

  req.on("end", () => {
    const parsedBody = Buffer.concat(body).toString();
    const returnDetails = JSON.parse(parsedBody);

    // find the book in the database
    const bookIndex = booksDB.findIndex((book) => {
      return book.id === returnDetails.bookId;
    });

    // Return 404 if book not found
    if (bookIndex === -1) {
      res.writeHead(404);
      res.end(
        JSON.stringify({
          message: "Book not found",
        })
      );
      return;
    }

    // Check if the book is actually loaned out
    if (!booksDB[bookIndex].isLoanedOut) {
      res.writeHead(400); // Bad Request
      res.end(
        JSON.stringify({
          message: "The book is not currently loaned out",
        })
      );
      return;
    }

    // Update the book in the database to mark it as returned
    booksDB[bookIndex].isLoanedOut = false;
    booksDB[bookIndex].loanee = "";
    booksDB[bookIndex].loanDate = "";

    // Save to database
    fs.writeFile(booksDbPath, JSON.stringify(booksDB), (err) => {
      if (err) {
        console.log(err);
        res.writeHead(500);
        res.end(
          JSON.stringify({
            message:
              "Internal Server Error. Could not update book in database.",
          })
        );
      }

      res.end(JSON.stringify(booksDB[bookIndex]));
    });
  });
};

// DELETE A BOOK ==> DELETE: /books
const deleteBook = (req, res) => {
  const bookId = req.url.split("=")[1];
  // Remove book from database
  const bookIndex = booksDB.findIndex((book) => {
    return book.id === parseInt(bookId);
  });

  if (bookIndex === -1) {
    res.writeHead(404);
    res.end(
      JSON.stringify({
        message: "Book not found",
      })
    );

    return;
  }

  booksDB.splice(bookIndex, 1); // remove the book from the database using the index

  // update the db
  fs.writeFile(booksDbPath, JSON.stringify(booksDB), (err) => {
    if (err) {
      console.log(err);
      res.writeHead(500);
      res.end(
        JSON.stringify({
          message:
            "Internal Server Error. Could not delete book from database.",
        })
      );
    }

    res.end(
      JSON.stringify({
        message: "Book deleted",
      })
    );
  });
};

const server = http.createServer(requestHandler);

server.listen(PORT, HOST_NAME, () => {
  booksDB = JSON.parse(fs.readFileSync(booksDbPath, "utf8"));
  usersDB = JSON.parse(fs.readFileSync(usersDbPath, "utf8"));
  console.log(`Server is listening on ${HOST_NAME}:${PORT}`);
});

module.exports = server;
