import { createConnection } from "typeorm";
import { User } from "./entity/User";
import { hash } from "bcryptjs";
type Role = "user" | "manager";

async function seed() {
  const connection = await createConnection();

  const userRepository = connection.getRepository(User);

  // Define users to seed
  const users = [
    {
      fullName: "John Doe",
      email: "john.doe@example.com",
      password: await hash("password123", 10),
      role: "user" as Role,
      createdAt: new Date(),
      isVerified: 1,
    },
    {
      fullName: "Jane Smith",
      email: "jane.smith@example.com",
      password: await hash("password123", 10),
      role: "manager" as Role,
      createdAt: new Date(),
      isVerified: 0,
    },
    {
      fullName: "Admin User",
      email: "admin@example.com",
      password: await hash("adminpassword", 10),
      role: "manager" as Role,
      createdAt: new Date(),
      isVerified: 1,
    },
  ];

  // Insert users
  for (const user of users) {
    const newUser = userRepository.create(user);
    await userRepository.save(newUser);
  }

  console.log("Seeding complete");
  await connection.close();
}

seed().catch((err) => {
  console.error("Error seeding data", err);
});
