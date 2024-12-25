import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Customer } from './entities/customer.entity';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Omit<Customer, 'password'>> {
    const { email, password } = createCustomerDto;
    const existingCustomer = await this.customerRepository.findOne({ where: { email } });
    if (existingCustomer) {
      throw new BadRequestException('Email is already registered.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      password: hashedPassword,
    });
    const savedCustomer = await this.customerRepository.save(customer);
    const { password: _, ...result } = savedCustomer;
    return result;
  }

  async register(registerDto: RegisterCustomerDto): Promise<Omit<Customer, 'password'>> {
    const { email, password, balance } = registerDto;
    const existingCustomer = await this.customerRepository.findOne({ where: { email } });
    if (existingCustomer) {
      throw new BadRequestException('Email is already registered.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = this.customerRepository.create({
      ...registerDto,
      password: hashedPassword,
      balance: balance || 0.0,
    });
    const savedCustomer = await this.customerRepository.save(customer);
    const { password: _, ...result } = savedCustomer;
    return result;
  }

  async login(loginDto: LoginCustomerDto): Promise<{ token: string }> {
    const { email, password } = loginDto;
    const customer = await this.customerRepository.findOne({ where: { email } });
    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const token = this.jwtService.sign({ id: customer.id, email: customer.email });
    return { token };
  }

  async findOne(id: number): Promise<Omit<Customer, 'password'>> {
    const customer = await this.customerRepository.findOne({ where: { id } });
    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }
    const { password, ...result } = customer;
    return result;
  }

  async findAll(): Promise<Omit<Customer, 'password'>[]> {
    const customers = await this.customerRepository.find();
    return customers.map(({ password, ...result }) => result);
  }

  async update(id: number, updateData: UpdateCustomerDto): Promise<Omit<Customer, 'password'>> {
    const customer = await this.customerRepository.preload({
      id,
      ...updateData,
    });
    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }
    const updatedCustomer = await this.customerRepository.save(customer);
    const { password, ...result } = updatedCustomer;
    return result;
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.customerRepository.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException('Customer not found or already deleted.');
    }
    return { message: 'Customer deleted successfully.' };
  }
}
