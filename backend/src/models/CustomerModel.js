import db from "../config/db.js";

// Get all customers (with wallet_balance)
export async function getAllCustomers() {
  const [rows] = await db.execute(
    `
    SELECT 
      c.id,
      c.full_name,
      c.country_code,
      c.mobile_number,
      c.email,
      c.preferred_restaurant,
      c.date_of_birth,
      c.referral_code,
      c.gender,
      c.created_at,
      c.updated_at,
      COALESCE(w.balance, 0) AS wallet_balance
    FROM customers c
    LEFT JOIN customer_wallets w
      ON w.customer_id = c.id
    ORDER BY c.id DESC
    `
  );
  return rows;
}

// Get single customer (with wallet_balance)
export async function getCustomerById(id) {
  const [[row]] = await db.execute(
    `
    SELECT 
      c.id,
      c.full_name,
      c.country_code,
      c.mobile_number,
      c.email,
      c.preferred_restaurant,
      c.date_of_birth,
      c.referral_code,
      c.gender,
      c.created_at,
      c.updated_at,
      COALESCE(w.balance, 0) AS wallet_balance
    FROM customers c
    LEFT JOIN customer_wallets w
      ON w.customer_id = c.id
    WHERE c.id = ?
    `,
    [id]
  );
  return row;
}

// Add a new customer
export async function createCustomer(
  full_name,
  country_code,
  mobile_number,
  email,
  passwordHash,
  preferred_restaurant,
  date_of_birth,
  referral_code,
  gender
) {
  const [result] = await db.execute(
    `INSERT INTO customers 
     (full_name, country_code, mobile_number, email, password,
      preferred_restaurant, date_of_birth, referral_code, gender,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      full_name,
      country_code,
      mobile_number,
      email,
      passwordHash,
      preferred_restaurant || null,
      date_of_birth || null,
      referral_code || null,
      gender || null,
    ]
  );
  return result.insertId;
}

// Update customer info
export async function updateCustomer(id, updates) {
  const fields = [];
  const params = [];

  for (const key of [
    "full_name",
    "country_code",
    "mobile_number",
    "email",
    "password",
    "preferred_restaurant",
    "date_of_birth",
    "referral_code",
    "gender",
  ]) {
    if (updates[key]) {
      fields.push(`${key} = ?`);
      params.push(updates[key]);
    }
  }

  if (!fields.length) return false;

  params.push(id);
  const sql = `UPDATE customers SET ${fields.join(
    ", "
  )}, updated_at = NOW() WHERE id = ?`;
  await db.execute(sql, params);
  return true;
}

// Delete permanently
export async function deleteCustomer(id) {
  await db.execute(`DELETE FROM customers WHERE id = ?`, [id]);
  return true;
}
