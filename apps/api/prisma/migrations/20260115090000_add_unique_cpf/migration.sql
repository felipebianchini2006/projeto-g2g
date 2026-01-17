-- Add unique constraint for CPF on users
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");
