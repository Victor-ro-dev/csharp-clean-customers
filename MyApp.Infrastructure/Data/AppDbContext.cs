using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using MyApp.Core.Entities;

namespace MyApp.Infrastructure.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options) 
    {
        public DbSet<CustomerEntity> Customers {get;set; }
        
    }
}