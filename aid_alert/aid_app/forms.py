from django import forms
from .models import Product

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['name', 'description', 'category', 'condition', 'price', 'stock_quantity', 'image']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Enter product name',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'form-textarea',
                'placeholder': 'Describe your product in detail...',
                'rows': 4,
                'required': True
            }),
            'category': forms.Select(attrs={
                'class': 'form-select',
                'required': True
            }),
            'condition': forms.Select(attrs={
                'class': 'form-select',
                'required': True
            }),
            'price': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '0.00',
                'step': '0.01',
                'min': '0',
                'required': True
            }),
            'stock_quantity': forms.NumberInput(attrs={
                'class': 'form-input',
                'placeholder': '1',
                'min': '1',
                'required': True
            }),
            'image': forms.FileInput(attrs={
                'class': 'form-input',
                'accept': 'image/*'
            })
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['name'].label = 'Product Name *'
        self.fields['description'].label = 'Description *'
        self.fields['category'].label = 'Category *'
        self.fields['condition'].label = 'Condition *'
        self.fields['price'].label = 'Price ($) *'
        self.fields['stock_quantity'].label = 'Stock Quantity *'
        self.fields['image'].label = 'Product Image'
