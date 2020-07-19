from django.http import HttpResponse
from django.shortcuts import render


# Create your views here.
def index(request):

    return render(request,
                  'index.html'
                  )

def kalibrierung(request):

    return render(request, 'kalibrierung.html')

def anleitung(request):
    f = open('README.md', 'r')
    file_content = f.read()
    f.close()
    context = {'file_content': file_content}
    return render(request, "Einleitung.html", context)
