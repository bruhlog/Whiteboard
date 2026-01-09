import { v4 as uuid } from "uuid";

export function getUser() {
  let user = localStorage.getItem("user");

  if (!user) {
    const name = prompt("Enter your name");
    user = {
      id: uuid(),
      name
    };
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    user = JSON.parse(user);
  }

  return user;
}
