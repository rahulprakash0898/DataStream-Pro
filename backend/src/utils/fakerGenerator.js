import { faker } from "@faker-js/faker";

export const generateRandomUser = () => {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    age: faker.number.int({ min: 18, max: 80 }),
    city: faker.location.city(),
    country: faker.location.country(),
    phone: faker.phone.number(),
    company: faker.company.name(),
    salary: faker.number.int({ min: 30000, max: 200000 }),
    createdAt: faker.date.past()
  };
};