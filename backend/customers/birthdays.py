def upcoming_birthday_customers(queryset, days=3):
    days = max(int(days), 0)
    rows = [
        customer
        for customer in queryset
        if customer.days_until_birthday is not None and customer.days_until_birthday <= days
    ]
    return sorted(rows, key=lambda customer: (customer.days_until_birthday, customer.name.lower()))
