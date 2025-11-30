import { createThirdwebClient } from "thirdweb";


const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";

if (!CLIENT_ID) {
  console.warn(
    "add clientid to .env file"
  );
}

export const client = createThirdwebClient({
  clientId: CLIENT_ID,
});

