
import { IsInt, IsPositive, Min } from 'class-validator';

export class TopupWalletDto {
    @IsInt()
    @IsPositive()
    @Min(500, { message: 'O valor mínimo para adicionar saldo é R$ 5,00.' })
    amountCents!: number;
}
