from django.http import HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request):

    return render(request,
                  'index.html'
                  )

def kalibrierung(request):

    return render(request, 'kalibrierung.html')

def uebungen(request):
    return render(request, 'Einleitung.html')